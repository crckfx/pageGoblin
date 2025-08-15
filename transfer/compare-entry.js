import fs from "fs";
import path from "path";
import { scanDifferences } from "../plan/scanEntryImports.js";
import { isCLI, logChange } from "../etc/helpers.js";

/**
 * Resolves imports for a single page config (dry run).
 * Scans for differences and returns paths that would be written.
 *
 * @param {string} absProjectRoot - Absolute path to project root.
 * @param {object} pageConfig - A single page config object (flattened form).
 * @param {object} options
 * @param {boolean} [options.verbose=false] - Verbose logging.
 * @param {string} [options.pageId] - Optional identifier for the page.
 * @returns {object} Scan result including allChanges and expectedPaths
 */
export function compareEntry(absProjectRoot, pageConfig, options = {}) {
    const {
        verbose = false,
        pageId = "",
    } = options;

    const imports = pageConfig.imports ?? [];
    const outputDir = path.resolve(absProjectRoot, path.dirname(pageConfig.outputPath));

    const expectedPaths = new Set();
    const allChanges = [];

    for (const importPath of imports) {
        const src = path.resolve(absProjectRoot, importPath);
        const dst = path.join(outputDir, path.basename(importPath));

        if (!fs.existsSync(src)) {
            logChange({ status: "SKIP", relative: importPath }, { verbose });
            continue;
        }

        const changes = scanDifferences(src, dst);
        changes.forEach((c) => {
            expectedPaths.add(path.resolve(c.dstPath));
            logChange(c, { verbose });
        });

        allChanges.push(...changes);
    }

    if (verbose) {
        console.log(`📄 [${pageId}] Scanned ${allChanges.length} files.`);
    }

    return {
        pageId,
        scanned: allChanges.length,
        changes: allChanges,
        expectedPaths,
    };
}

// CLI entry point
if (isCLI(import.meta.url)) {
    const args = process.argv.slice(2);
    const [projectRootArg, jsonEntryPath, ...rest] = args;

    if (!projectRootArg || !jsonEntryPath) {
        console.error("Usage: node resolve-page.js <projectRoot> <pageJsonEntry> [--verbose]");
        process.exit(1);
    }

    const verboseMode = rest.includes("--verbose");
    const absProjectRoot = path.resolve(projectRootArg);
    const pageEntryRaw = fs.readFileSync(jsonEntryPath, "utf-8");
    const pageConfig = JSON.parse(pageEntryRaw);
    const pageId = path.basename(jsonEntryPath, path.extname(jsonEntryPath));

    const result = resolvePage(absProjectRoot, pageConfig, {
        verbose: verboseMode,
        pageId,
    });

    console.log(`\n📄 [${result.pageId}] ${result.scanned} files scanned.`);
}
