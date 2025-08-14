#!/usr/bin/env node
// run-img-goblin.js
// Usage:
//   node run-img-goblin.js <projectRoot> [--write] [--verbose]
//
// Behavior:
//   - Read <projectRoot>/.pageGoblin/dist.txt for the webroot (dist) directory
//   - Read <projectRoot>/.pageGoblin/cache.json
//   - For each cached HTML (absolute path) that exists and isn't marked jobs.imgGoblin === true:
//       * run applyImgGoblinToBuiltPage(htmlPath, { webRoot, write, verbose })
//       * if it returns true AND --write is set, set jobs.imgGoblin = true
//   - Write cache once at the end only when --write is set

import fs from "fs";
import path from "path";
import { isCLI } from "./etc/helpers.js";

// imgGoblin modules
import { imagePresets } from "./imgGoblin/global.js";
import { getTaggedImagesWithPresets } from "./imgGoblin/functions.js";
import { processHtml } from "./imgGoblin/processHtml.js";
import { loadHtml } from "./etc/cheerio-util.js";

const JOB_KEY = "imgGoblin";

/**
 * Apply imgGoblin transforms to a single built HTML page.
 * Returns true on success (even if no changes). Exceptions bubble to caller.
 * Only writes to disk if options.write === true.
 */
function applyImgGoblinToBuiltPage(htmlPath, { webRoot, write = false, verbose = false } = {}) {
    const $ = loadHtml(htmlPath);
    const nodes = getTaggedImagesWithPresets($, imagePresets);

    if (!nodes.length) {
        if (verbose) console.log(`[NONE] (no targets) ${htmlPath}`);
        return true; // nothing to do is still success
    }

    const logs = processHtml($, nodes, webRoot);

    if (!logs.length) {
        if (verbose) console.log(`[NOOP] (no changes) ${htmlPath}`);
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
// Sweep the cache for pages needing imgGoblin, then apply to those pages.
function sweepCacheForImgGoblin() {
    const [projectRootArg, ...flags] = process.argv.slice(2);
    const verbose = flags.includes("--verbose");
    const write = flags.includes("--write");

    if (!projectRootArg) {
        console.error("Usage: run-img-goblin <projectRoot> [--write] [--verbose]");
        process.exit(2);
    }

    const projectRoot = path.resolve(projectRootArg);
    const goblinDir = path.join(projectRoot, ".pageGoblin");
    const cachePath = path.join(goblinDir, "cache.json");
    const distTxtPath = path.join(goblinDir, "dist.txt");

    if (!fs.existsSync(distTxtPath)) {
        console.error(`Missing required file: ${distTxtPath}`);
        process.exit(1);
    }
    const distRaw = fs.readFileSync(distTxtPath, "utf8").trim();
    if (!distRaw) {
        console.error(`Empty dist path in: ${distTxtPath}`);
        process.exit(1);
    }
    const webRoot = path.resolve(distRaw);

    const cache = fs.existsSync(cachePath)
        ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
        : {};

    let consideredCount = 0,
        processedCount = 0,
        skippedAlreadyDoneCount = 0,
        missingOnDiskCount = 0,
        failedCount = 0;

    for (const [key, entry] of Object.entries(cache)) {
        // Only HTML files that exist (cache keys are absolute HTML paths):
        if (!/\.html?$/i.test(key)) continue;

        const absKey = path.resolve(key);
        if (!fs.existsSync(absKey)) { missingOnDiskCount++; continue; }

        consideredCount++;

        if (entry?.jobs?.[JOB_KEY] === true) {
            if (verbose) console.log(`[SKIP:done] ${absKey}`);
            skippedAlreadyDoneCount++;
            continue;
        }

        if (verbose) console.log(`[RUN] ${absKey}`);

        try {
            const ok = applyImgGoblinToBuiltPage(absKey, { webRoot, write, verbose });
            if (ok && write) {
                entry.jobs = entry.jobs || {};
                entry.jobs[JOB_KEY] = true;
                processedCount++;
            } else if (!write && ok) {
                // preview mode: do not mark cache
            } else if (!ok) {
                failedCount++;
                if (verbose) console.error(`[FAIL:false] ${absKey}`);
            }
        } catch (err) {
            failedCount++;
            console.error(`[FAIL:exception] ${absKey}\n  → ${err.message}`);
        }
    }

    if (write) {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    }

    // One-line summary by default; detailed breakdown with --verbose
    const mode = write ? "write" : "preview";
    const summaryOneLine =
        `imgGoblin(${mode}): run=${processedCount} skip=${skippedAlreadyDoneCount} ` +
        `miss=${missingOnDiskCount} fail=${failedCount} total=${consideredCount}`;
    console.log(summaryOneLine);
    if (verbose) {
        console.log(
            `  considered=${consideredCount} skipDone=${skippedAlreadyDoneCount} ` +
            `missing=${missingOnDiskCount} failed=${failedCount} cache=${Object.keys(cache).length}`
        );
    }

    if (failedCount) process.exit(1);
}

if (isCLI(import.meta.url)) sweepCacheForImgGoblin();

// Exported for future programmatic use
export { applyImgGoblinToBuiltPage, sweepCacheForImgGoblin };
