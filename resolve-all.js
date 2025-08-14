#!/usr/bin/env node

import chalk from "chalk";
import path from "path"; // NEW: for absolute dist
import { isCLI } from "./etc/helpers.js";
import { saveGoblinCache } from "./etc/cache-utils.js";
import { scanAll } from "./plan/scanAll.js";
import { cleanFromPlan } from "./plan/cleanFromPlan.js";
import { writeFromPlan } from "./plan/writeFromPlan.js";

/* --------------------------- Orchestrator API -------------------------- */

export async function resolveAll(projectRoot, distRoot, pagesJsonPath, configPath, options = {}) {
    const { write = false, clean = false, verbose = false } = options;

    // Canonicalize once so both the plan and the on-disk cache get the same absolute dist
    const absDistRoot = path.resolve(distRoot);

    // scan it up
    const plan = await scanAll(projectRoot, absDistRoot, pagesJsonPath, configPath, verbose);

    // keep track of real changes
    let totalWritten = 0, totalRendered = 0, totalDeleted = 0;

    if (write) {
        const { totalRendered: r, totalWritten: w } = await writeFromPlan(plan, { verbose });
        totalRendered = r;
        totalWritten = w;
        // Write the new on-disk shape with absolute dist
        saveGoblinCache(plan.root, plan.goblinCache, absDistRoot);
    }

    if (clean) {
        const { totalDeleted: d, cacheModified } = cleanFromPlan(plan);
        totalDeleted = d;
        if (cacheModified) saveGoblinCache(plan.root, plan.goblinCache, absDistRoot);
    }

    // summary output
    console.log(`📄 Scanned ${plan.totalScanned} files for copying.`);
    console.log(`📄 Scanned ${plan.pages.length} pages for rendering.`);
    if (write) {
        if (totalWritten > 0) console.log(`✍️  Total files copied: ${totalWritten}`);
        if (totalRendered > 0) console.log(`✍️  Total pages rendered: ${totalRendered}`);
    }
    if (clean) {
        if (totalDeleted > 0) console.log(`🗑️  Orphans deleted: ${totalDeleted}`);
    }

    // (CURRENTLY USELESS) return the result
    return {
        scanned: plan.totalScanned,
        written: totalWritten,
        rendered: totalRendered,
        deleted: totalDeleted
    };
}

/* --------------------------------- CLI -------------------------------- */

if (isCLI(import.meta.url)) {
    const [root, dist, pages, config, ...rest] = process.argv.slice(2);
    if (!root || !dist || !pages || !config) {
        console.log("Usage: node resolve-all.js <projectRoot> <distRoot> <pagesJson> <configJson> [--write] [--clean] [--verbose]");
        process.exit(1);
    }
    resolveAll(root, dist, pages, config, {
        write: rest.includes("--write"),
        clean: rest.includes("--clean"),
        verbose: rest.includes("--verbose"),
    }).catch((err) => {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
    });
}
