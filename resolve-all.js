// resolve.all.js
import chalk from "chalk";
import path from "path";
import { isCLI } from "./etc/helpers.js";
import { saveGoblinCache } from "./etc/cache-utils.js";
import { createPlan } from "./plan/createPlan.js";
import { cleanFromPlan } from "./execute/cleanFromPlan.js";
import { writeFromPlan } from "./execute/writeFromPlan.js";
import { loadAndValidateConfig } from "./etc/config-utils.js";
import { generateMap_JSON } from "./plugins/mapGen.js";

async function runGenerators({ plan, config, distRoot, verbose }) {
    if (!config.flags?.generate) return;

    for (const [key, outFile] of Object.entries(config.flags.generate)) {
        const outputPath = path.resolve(distRoot, outFile);

        switch (key) {
            case "map_JSON":
                await generateMap_JSON({ plan, distRoot, outputPath, verbose });
                break;

            default:
                throw new Error(`Unknown generator key: ${key}`);
        }
    }
}


/* --------------------------- Orchestrator API -------------------------- */

export async function resolveAll(projectRoot, distRoot, configPath, options = {}) {
    const { write = false, clean = false, verbose = false } = options;

    // Canonicalise dist
    const absDistRoot = path.resolve(distRoot);

    // Load + validate + resolve config paths
    const config = await loadAndValidateConfig(projectRoot, configPath);

    // Scan
    const plan = await createPlan(projectRoot, absDistRoot, config, verbose);

    // Track counts
    let totalWritten = 0, totalRendered = 0, totalDeleted = 0;

    if (write) {
        const { totalRendered: r, totalWritten: w } = await writeFromPlan(plan, { verbose });
        totalRendered = r;
        totalWritten = w;
        plan.goblinCache.dist = absDistRoot;
        saveGoblinCache(plan.root, plan.goblinCache);
        await runGenerators({ plan, config, distRoot: absDistRoot, verbose });
    }

    if (clean) {
        const { totalDeleted: d, cacheModified } = cleanFromPlan(plan);
        totalDeleted = d;
        if (cacheModified) saveGoblinCache(plan.root, plan.goblinCache, absDistRoot);
    }

    // Summary
    console.log(`📄 Scanned ${plan.totalImports} asset files for copying.`);
    console.log(`📄 Scanned ${plan.pages.length} locations (${plan.renderablePages} renderable pages).`);
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
