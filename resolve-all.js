#!/usr/bin/env node

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { flattenPages } from "./read/flatten-pages.js";
import { compareEntry } from "./read/compare-entry.js";
import { renderPage } from "./render/render.js";
import { applyChanges } from "./copy/write.js";
import { isCLI, loadJSON, logChange, walkAllFiles } from "./etc/helpers.js";

// 🧠 Main function
export async function resolveAll(projectRoot, distRoot, pagesJsonPath, configPath, options = {}) {
    const { write = false, clean = false, verbose = false } = options;

    const root = path.resolve(projectRoot);
    const dist = path.resolve(distRoot);

    const defaults = await loadJSON(configPath);
    const nested = await loadJSON(pagesJsonPath);
    const flatPages = flattenPages(nested);

    // resolve the optional shared global HTML path (only once)
    const defaultGlobalHtmlPath = defaults.globalHtmlPath
        ? path.resolve(root, defaults.globalHtmlPath)
        : null;

    const expectedPaths = new Set();
    const allChanges = [];
    let totalScanned = 0;
    let totalWritten = 0;
    let totalRendered = 0;
    let totalDeleted = 0;

    for (const page of flatPages) {
        const {
            title, contentPath, outputPath, pageId,
            imports = [], styles = [], scripts = [], modules = [],
            navPath = null, articleId = null, image = null,
        } = page;

        // All remaining paths: resolve user-provided or default to expected project-relative paths
        const templatePath = path.resolve(root, page.templatePath ?? defaults.templatePath);
        const headContentPath = path.resolve(root, page.headContentPath ?? defaults.headContentPath);
        const headerPath = path.resolve(root, page.headerPath ?? defaults.headerPath);
        const footerPath = path.resolve(root, page.footerPath ?? defaults.footerPath);
        
        const globalHtmlPath = page.globalHtmlPath
            ? path.resolve(root, page.globalHtmlPath)
            : defaultGlobalHtmlPath;


        // ── Rendering Phase ──
        if (!contentPath || !outputPath) {
            if (verbose) console.warn(chalk.gray(`[SKIP] ${pageId}: no contentPath or outputPath`));
        } else {
            const pagePath = path.resolve(root, contentPath);
            const outputHtmlPath = path.resolve(root, outputPath);

            if (fs.existsSync(pagePath)) {
                await renderPage({
                    title,
                    pagePath,
                    outputPath: outputHtmlPath,
                    headContentPath,
                    headerPath,
                    footerPath,
                    templatePath,
                    scripts,
                    modules,
                    styles,
                    globalHtmlPath,
                    navPath,
                    articleId,
                    image
                });
                totalRendered++;
            } else {
                console.warn(chalk.red(`[MISSING] ${pageId}: ${contentPath}`));
            }
        }

        // ── Resolve Imports Phase ──
        const result = compareEntry(root, page, {
            verbose,
            pageId,
        });

        totalScanned += result.scanned;
        allChanges.push(...result.changes);
        for (const p of result.expectedPaths) {
            expectedPaths.add(p);
        }

        // Track output HTML path as expected (rendered output)
        if (outputPath) {
            const htmlOut = path.resolve(root, outputPath);
            expectedPaths.add(htmlOut);
        }

        // Also track expected import destinations
        const outputDir = path.resolve(root, path.dirname(outputPath));
        for (const importPath of imports) {
            const dst = path.join(outputDir, path.basename(importPath));
            expectedPaths.add(path.resolve(dst));
        }
    }

    console.log(`\n📄 Total files scanned: ${totalScanned}`);
    if (write) {
        const pendingWrites = allChanges.filter(c => c.status !== "MATCHES");
        const written = applyChanges(pendingWrites);
        written.forEach(entry => {
            logChange({ ...entry, status: "WRITTEN" });
            expectedPaths.add(path.resolve(entry.dstPath));
        });
        totalWritten = written.length;
        console.log(`✍️  Total files written: ${totalWritten}`);
    }

    console.log(`✅ Rendered ${totalRendered} pages.`);

    if (clean) {
        const allDistFiles = walkAllFiles(dist);
        for (const abs of allDistFiles) {
            if (!expectedPaths.has(abs)) {
                const rel = path.relative(dist, abs);
                logChange({ status: "DELETE", relative: rel });
                fs.unlinkSync(abs);
                totalDeleted++;
            }
        }
        console.log(`🗑️  Orphans deleted: ${totalDeleted}`);
    }

    return {
        scanned: totalScanned,
        written: totalWritten,
        rendered: totalRendered,
        deleted: totalDeleted,
    };
}

// ─── CLI ENTRY ───
if (isCLI(import.meta.url)) {
    const args = process.argv.slice(2);
    const [root, dist, pages, config, ...rest] = args;

    if (!root || !dist || !pages || !config) {
        console.log("Usage: node resolve-all.js <projectRoot> <distRoot> <pagesJson> <configJson> [--write] [--clean] [--verbose]");
        process.exit(1);
    }

    const writeMode = rest.includes("--write");
    const cleanMode = rest.includes("--clean");
    const verboseMode = rest.includes("--verbose");

    resolveAll(root, dist, pages, config, {
        write: writeMode,
        clean: cleanMode,
        verbose: verboseMode,
    }).catch((err) => {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
    });
}
