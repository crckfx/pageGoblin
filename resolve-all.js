import fs from "fs";
import path from "path";
import chalk from "chalk";

import { flattenPages } from "./read/flatten-pages.js";
import { applyChanges } from "./copy/write.js";
import { isCLI, loadJSON, logChange, walkAllFiles } from "./etc/helpers.js";
import { renderEntry } from "./render/render-entry.js";
import { resolveEntryImports } from "./resolve-entry-imports.js";
import { hashText, loadGoblinCache, saveGoblinCache } from "./etc/cache-utils.js";


// ─── Scan Render Step ───
function scanRenderEntry(root, page, config, defaultGlobalHtmlPath, goblinCache) {
    const dstPath = page.outputPath;
    const cacheKey = path.resolve(dstPath || "[no-output]");

    const inputFiles = {
        template: config.templatePath,
        page: page.contentPath,
        head: config.headContentPath,
        header: config.headerPath,
        footer: config.footerPath,
        global: defaultGlobalHtmlPath || undefined
    };

    const inputHashes = {};
    for (const [key, filePath] of Object.entries(inputFiles)) {
        if (!filePath) continue;
        try {
            const content = fs.readFileSync(filePath, "utf8");
            inputHashes[key] = hashText(content);
        } catch {
            inputHashes[key] = null;
        }
    }

    const cached = goblinCache[cacheKey];
    const needsRender = !cached || JSON.stringify(cached.inputHashes) !== JSON.stringify(inputHashes);

    return { dstPath, needsRender, cacheKey, inputHashes };
}


// ─── Main Orchestration ───
export async function resolveAll(projectRoot, distRoot, pagesJsonPath, configPath, options = {}) {
    const { write = false, clean = false, verbose = false } = options;
    const root = path.resolve(projectRoot);
    const dist = path.resolve(distRoot);

    const rawConfig = await loadJSON(configPath);
    const config = rawConfig.default ? { ...rawConfig, ...rawConfig.default } : rawConfig;
    delete config.default;

    const pages = flattenPages(await loadJSON(pagesJsonPath));
    const defaultGlobalHtmlPath = config.globalHtmlPath
        ? path.resolve(root, config.globalHtmlPath)
        : null;

    const goblinCache = loadGoblinCache(root);
    const expectedPaths = new Set();
    const allChanges = [];
    const renderPlans = [];
    let totalScanned = 0, totalWritten = 0, totalRendered = 0, totalDeleted = 0;

    for (const page of pages) {
        // 📄 Plan render step
        const renderPlan = scanRenderEntry(root, page, config, defaultGlobalHtmlPath, goblinCache);
        renderPlans.push({ ...renderPlan, page });

        if (!renderPlan.needsRender) {
            if (verbose) console.log(chalk.gray(`[SKIP] ${renderPlan.cacheKey}: inputs unchanged`));
        }

        // 📦 Plan copy/import changes
        const { scanned, changes } = resolveEntryImports(root, page, expectedPaths, verbose);
        totalScanned += scanned;
        allChanges.push(...changes);
    }

    if (write) {
        // ✍️  Execute render plans
        for (const plan of renderPlans) {
            if (plan.needsRender) {
                const didRender = await renderEntry(root, plan.page, config, defaultGlobalHtmlPath, verbose);
                if (didRender) {
                    goblinCache[plan.cacheKey] = { inputHashes: plan.inputHashes };
                    totalRendered++;
                    if (verbose) console.log(`Rendered ${plan.dstPath}`);
                }
            }
        }

        // ✍️  Execute copy changes
        const pending = allChanges.filter(c => c.status !== "MATCHES");
        const written = applyChanges(pending);
        written.forEach((entry) => {
            logChange({ ...entry, status: "WRITTEN" });
            expectedPaths.add(path.resolve(entry.dstPath));
        });
        totalWritten = written.length;

        saveGoblinCache(root, goblinCache);
    }

    if (clean) {
        for (const abs of walkAllFiles(dist)) {
            if (!expectedPaths.has(abs)) {
                logChange({ status: "DELETE", relative: path.relative(dist, abs) });
                fs.unlinkSync(abs);
                totalDeleted++;
            }
        }
    }

    console.log(`\n📄 Total files scanned: ${totalScanned}`);
    if (write) console.log(`✍️  Total files written: ${totalWritten}`);
    console.log(`✅ Rendered ${totalRendered} pages.`);
    if (clean) console.log(`🗑️  Orphans deleted: ${totalDeleted}`);

    return { scanned: totalScanned, written: totalWritten, rendered: totalRendered, deleted: totalDeleted };
}

// ─── CLI ENTRY ───
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