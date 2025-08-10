#!/usr/bin/env node
// run-img-goblin.js
// Usage:
//   node run-img-goblin.js <projectRoot> <distRoot> [--verbose] [--dry-run]
//
// Behavior:
//   - Read <projectRoot>/.pageGoblin/cache.json
//   - For each cached HTML under <distRoot> that exists and isn't marked jobs.imgGoblin === true:
//       * run runImgGoblin(htmlPath)  ← now calls your imgGoblin modules
//       * if it returns true, set jobs.imgGoblin = true
//   - Write cache once at the end (unless --dry-run)

import fs from "fs";
import path from "path";
import { isCLI } from "./etc/helpers.js";

// uses your imgGoblin modules
import { imagePresets } from "./imgGoblin/global.js";
import { getTaggedImagesWithPresets } from "./imgGoblin/functions.js";
import { processHtml } from "./imgGoblin/processHtml.js";
import { loadHtml } from "./etc/cheerio-util.js";

const JOB = "imgGoblin";

/**
 * Run the image replacement on a single HTML file.
 * Return true on success (even if no changes), false on failure.
 */
function runImgGoblin(htmlPath, distRoot, { verbose = false } = {}) {
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

    fs.writeFileSync(htmlPath, $.html(), "utf8");
    if (verbose) console.log(`[OK:${JOB}] ${logs.length} change(s) → ${htmlPath}`);
    return true;
}

// --------------------------- CLI --------------------------------------
function runImgGoblinCLI() {
    const [projectRootArg, distRootArg, ...flags] = process.argv.slice(2);
    const verbose = flags.includes("--verbose");
    const dryRun = flags.includes("--dry-run");

    if (!projectRootArg || !distRootArg) {
        console.error("Usage: run-img-goblin <projectRoot> <distRoot> [--verbose] [--dry-run]");
        process.exit(2);
    }

    const projectRoot = path.resolve(projectRootArg);
    const distRoot = path.resolve(distRootArg);
    const cachePath = path.join(projectRoot, ".pageGoblin", "cache.json");

    const cache = fs.existsSync(cachePath)
        ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
        : {};

    let considered = 0, runCount = 0, skippedDone = 0, skippedOut = 0, missing = 0, failed = 0;

    for (const [key, entry] of Object.entries(cache)) {
        // Only HTML files, inside distRoot, that exist:
        if (!/\.html?$/i.test(key)) continue;

        const absKey = path.resolve(key);
        const relToDist = path.relative(distRoot, absKey);
        const isInsideDist = relToDist && !relToDist.startsWith("..") && !path.isAbsolute(relToDist);
        if (!isInsideDist) { skippedOut++; continue; }

        if (!fs.existsSync(absKey)) { missing++; continue; }

        considered++;

        if (entry?.jobs?.[JOB] === true) {
            if (verbose) console.log(`[SKIP:done] ${absKey}`);
            skippedDone++;
            continue;
        }

        if (verbose) console.log(`[RUN] ${absKey}`);

        if (dryRun) continue;

        try {
            const ok = runImgGoblin(absKey, distRoot, { verbose });
            if (ok) {
                entry.jobs = entry.jobs || {};
                entry.jobs[JOB] = true;
                runCount++;
            } else {
                failed++;
                if (verbose) console.error(`[FAIL:false] ${absKey}`);
            }
        } catch (err) {
            failed++;
            console.error(`[FAIL:exception] ${absKey}\n  → ${err.message}`);
        }
    }

    if (!dryRun) {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    }

    // One-line summary by default; detailed breakdown with --verbose
    const summaryOneLine =
        `imgGoblin: run=${runCount} skip=${skippedDone + skippedOut} ` +
        `miss=${missing} fail=${failed} total=${considered}`;
    console.log(summaryOneLine);
    if (verbose) {
        console.log(
            `  considered=${considered} skipDone=${skippedDone} ` +
            `skipOut=${skippedOut} missing=${missing} failed=${failed} ` +
            `cache=${Object.keys(cache).length}`
        );
    }

    if (failed) process.exit(1);
}

if (isCLI(import.meta.url)) runImgGoblinCLI();
