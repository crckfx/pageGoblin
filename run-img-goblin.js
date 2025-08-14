#!/usr/bin/env node
// Usage:
//   node run-img-goblin.js <projectRoot> [--write] [--verbose]
//
// Disk shape: .pageGoblin/cache.json = { pages: {...}, dist: "..." }
// In-memory for most code: flat map (pages)

import fs from "fs";
import path from "path";
import { isCLI } from "./etc/helpers.js";
import { loadGoblinCache, saveGoblinCache } from "./etc/cache-utils.js";

// Per-page worker uses existing imgGoblin modules
import { imagePresets } from "./imgGoblin/global.js";
import { getTaggedImagesWithPresets } from "./imgGoblin/functions.js";
import { processHtml } from "./imgGoblin/processHtml.js";
import { loadHtml } from "./etc/cheerio-util.js";

const JOB_KEY = "imgGoblin";

function readDistFromCache(projectRoot) {
    const file = path.join(projectRoot, ".pageGoblin", "cache.json");
    if (!fs.existsSync(file)) return "";
    try {
        const json = JSON.parse(fs.readFileSync(file, "utf8"));
        return typeof json.dist === "string" ? json.dist : "";
    } catch {
        return "";
    }
}

/**
 * Apply imgGoblin transforms to a single built HTML page.
 * Returns true on success (even if no changes). Exceptions bubble to caller.
 * Only writes to disk if options.write === true.
 */
function applyImgGoblinToBuiltPage(htmlPath, { distRoot, write = false, verbose = false } = {}) {
    const $ = loadHtml(htmlPath);
    const nodes = getTaggedImagesWithPresets($, imagePresets);

    if (!nodes.length) {
        if (verbose) console.log(`[NONE] ${htmlPath}`);
        return true; // nothing to do is still success
    }

    const logs = processHtml($, nodes, distRoot);

    if (!logs.length) {
        if (verbose) console.log(`[NOOP] ${htmlPath}`);
        return true; // transform decided no change
    }

    if (write) {
        fs.writeFileSync(htmlPath, $.html(), "utf8");
        if (verbose) console.log(`[OK:${JOB_KEY}] ${logs.length} change(s) → ${htmlPath}`);
    } else if (verbose) {
        console.log(`[PENDING:${JOB_KEY}] ${logs.length} change(s) → ${htmlPath} (use --write to apply)`);
    }

    return true;
}

// --------------------------- CLI --------------------------------------
function sweepCacheForImgGoblin() {
    const [projectRootArg, ...flags] = process.argv.slice(2);
    const verbose = flags.includes("--verbose");
    const write = flags.includes("--write");

    if (!projectRootArg) {
        console.error("Usage: run-img-goblin <projectRoot> [--write] [--verbose]");
        process.exit(2);
    }

    const projectRoot = path.resolve(projectRootArg);
    const distRoot = path.resolve(readDistFromCache(projectRoot) || "");
    if (!distRoot) {
        console.error("dist path not found in cache.json (expected { pages: {...}, dist: \"...\" }).");
        process.exit(1);
    }

    const pagesMap = loadGoblinCache(projectRoot); // flat map (json.pages)
    let considered = 0,
        processed = 0,
        skippedDone = 0,
        missing = 0,
        failed = 0;

    for (const [pagePath, entry] of Object.entries(pagesMap)) {
        if (!/\.html?$/i.test(pagePath)) continue;

        const absPagePath = path.resolve(pagePath);
        if (!fs.existsSync(absPagePath)) { missing++; continue; }

        considered++;

        if (entry?.jobs?.[JOB_KEY] === true) {
            if (verbose) console.log(`[SKIP:done] ${absPagePath}`);
            skippedDone++;
            continue;
        }

        if (verbose) console.log(`[RUN] ${absPagePath}`);

        try {
            const ok = applyImgGoblinToBuiltPage(absPagePath, { distRoot, write, verbose });
            if (ok && write) {
                entry.jobs = entry.jobs || {};
                entry.jobs[JOB_KEY] = true;
                processed++;
            } else if (!ok) {
                failed++;
                if (verbose) console.error(`[FAIL:false] ${absPagePath}`);
            }
        } catch (err) {
            failed++;
            console.error(`[FAIL:exception] ${absPagePath}\n  → ${err.message}`);
        }
    }

    if (write) {
        // persist updated flat map under { pages, dist }
        saveGoblinCache(projectRoot, pagesMap, distRoot);
    }

    const mode = write ? "write" : "preview";
    console.log(
        `imgGoblin(${mode}): run=${processed} skip=${skippedDone} miss=${missing} fail=${failed} total=${considered}`
    );
    if (failed) process.exit(1);
}

if (isCLI(import.meta.url)) sweepCacheForImgGoblin();

// Exported for future programmatic use
export { applyImgGoblinToBuiltPage, sweepCacheForImgGoblin };
