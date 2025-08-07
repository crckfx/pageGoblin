#!/usr/bin/env node

import fs from "fs";
import path from "path";
import chalk from "chalk";

import { flattenPages } from "./read/flatten-pages.js";
import { applyChanges } from "./copy/write.js";
import { isCLI, loadJSON, logChange, walkAllFiles } from "./etc/helpers.js";
import { renderEntry } from "./render/renderEntry.js";
import { resolveEntryImports } from "./read/resolve-entry-imports.js";
import { loadGoblinCache, saveGoblinCache } from "./etc/cache-utils.js";
import { scanRenderEntry } from "./read/scanRenderEntry.js";


// ─── Main Orchestration ───
export async function resolveAll(projectRoot, distRoot, pagesJsonPath, configPath, options = {}) {
    const { write = false, clean = false, verbose = false } = options;
    const root = path.resolve(projectRoot);
    const dist = path.resolve(distRoot);

    const rawConfig = await loadJSON(configPath);
    const config = rawConfig.default ? { ...rawConfig, ...rawConfig.default } : rawConfig;
    delete config.default;

    const pages = flattenPages(await loadJSON(pagesJsonPath));
    const goblinCache = loadGoblinCache(root);
    const expectedPaths = new Set();
    const copyChanges = [];
    const htmlChanges = [];
    let totalScanned = 0, totalWritten = 0, totalRendered = 0, totalDeleted = 0;

    for (const page of pages) {
        // 📄 Plan HTML render step
        const html = scanRenderEntry(root, page, config, goblinCache);
        html.forEach(change => expectedPaths.add(change.dstPath));
        htmlChanges.push(...html);

        // 📦 Plan copy/import changes
        const { scanned, changes } = resolveEntryImports(root, page, expectedPaths, verbose);
        totalScanned += scanned;
        copyChanges.push(...changes);
    }

    if (write) {
        // ✍️  Write HTML changes
        for (const { dstPath, inputHashes, cacheKey, status } of htmlChanges) {
            const page = pages.find(p => path.resolve(root, p.outputPath) === dstPath);
            const didRender = await renderEntry(root, page, config, verbose); // still passes null as fallback
            if (didRender) {
                goblinCache[cacheKey] = { inputHashes };
                totalRendered++;
                if (verbose) console.log(`Rendered ${dstPath}`);
            }
        }

        // ✍️  Write asset copy changes
        const pending = copyChanges.filter(c => c.status !== "MATCHES");
        const written = applyChanges(pending);
        written.forEach((entry) => {
            logChange({ ...entry, status: "WRITTEN" });
            expectedPaths.add(path.resolve(entry.dstPath));
        });
        totalWritten = written.length;

        saveGoblinCache(root, goblinCache);
    }

    if (clean) {
        const deletedHtmlKeys = [];
        for (const abs of walkAllFiles(dist)) {
            if (!expectedPaths.has(abs)) {
                logChange({ status: "DELETE", relative: path.relative(dist, abs) });
                fs.unlinkSync(abs);
                totalDeleted++;

                // clean up cache if HTML was deleted
                const absResolved = path.resolve(abs);
                if (goblinCache[absResolved]) {
                    deletedHtmlKeys.push(absResolved);
                }
            }
        }

        if (deletedHtmlKeys.length > 0) {
            for (const key of deletedHtmlKeys) {
                delete goblinCache[key];
            }
            saveGoblinCache(root, goblinCache);
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
