#!/usr/bin/env node

import chalk from "chalk";
import path from "path";
import { isCLI } from "./etc/helpers.js";
import { saveGoblinCache } from "./etc/cache-utils.js";
import { scanAll } from "./plan/scanAll.js";
import { cleanFromPlan } from "./execute/cleanFromPlan.js";
import { writeFromPlan } from "./execute/writeFromPlan.js";
import { loadAndValidateConfig } from "./etc/config-utils.js";

/* --------------------------- Orchestrator API -------------------------- */

export async function resolveAll(projectRoot, distRoot, configPath, options = {}) {
    const { write = false, clean = false, verbose = false } = options;

    // Canonicalise dist
    const absDistRoot = path.resolve(distRoot);

    // Load + validate + resolve config paths
    const config = await loadAndValidateConfig(projectRoot, configPath);

    // Scan
    const plan = await scanAll(projectRoot, absDistRoot, config, verbose);

    // Track counts
    let totalWritten = 0, totalRendered = 0, totalDeleted = 0;

    if (write) {
        const { totalRendered: r, totalWritten: w } = await writeFromPlan(plan, { verbose });
        totalRendered = r;
        totalWritten = w;
        saveGoblinCache(plan.root, plan.goblinCache, absDistRoot);
    }

    if (clean) {
        const { totalDeleted: d, cacheModified } = cleanFromPlan(plan);
        totalDeleted = d;
        if (cacheModified) saveGoblinCache(plan.root, plan.goblinCache, absDistRoot);
    }

    // Summary
    console.log(`📄 Scanned ${plan.totalScanned} files for copying.`);
    console.log(`📄 Scanned ${plan.pages.length} pages for rendering.`);
    if (write) {
        if (totalWritten > 0) console.log(`✍️  Total files copied: ${totalWritten}`);
        if (totalRendered > 0) console.log(`✍️  Total pages rendered: ${totalRendered}`);
    }
    if (clean && totalDeleted > 0) {
        console.log(`🗑️  Orphans deleted: ${totalDeleted}`);
    }

    return { scanned: plan.totalScanned, written: totalWritten, rendered: totalRendered, deleted: totalDeleted };
}

/* --------------------------------- CLI -------------------------------- */

if (isCLI(import.meta.url)) {
    const [root, dist, config, ...rest] = process.argv.slice(2);
    if (!root || !dist || !config) {
        console.log("Usage: node resolve-all.js <projectRoot> <distRoot> <configJson> [--write] [--clean] [--verbose]");
        process.exit(1);
    }
    resolveAll(root, dist, config, {
        write: rest.includes("--write"),
        clean: rest.includes("--clean"),
        verbose: rest.includes("--verbose"),
    }).catch((err) => {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
    });
}
