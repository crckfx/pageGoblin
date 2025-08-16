// plan/scanEntryImports.js
// Per-page planner (dry run): resolves declared imports and aggregates expectedPaths.

import fs from "fs";
import path from "path";
import { scanDifferences } from "../transfer/diffEngine.js";
import { logChange } from "../etc/helpers.js";

/**
 * Resolve imports for a single page config (dry-run).
 * - For each declared import (relative to project root), compute the destination
 *   under the page's output directory, diff it, and collect expected dst paths.
 *
 * @param {string} absProjectRoot
 * @param {{ outputPath:string, imports?:string[] }} pageConfig
 * @param {{ verbose?:boolean, pageId?:string }} [options]
 * @returns {{ pageId:string, scanned:number, changes:Array, expectedPaths:Set<string> }}
 */
export function scanEntryImports(absProjectRoot, pageConfig, options = {}) {
    const { verbose = false, pageId = "" } = options;

    const imports = pageConfig.imports ?? [];
    const outputDir = path.resolve(absProjectRoot, path.dirname(pageConfig.outputPath));

    const expectedPaths = new Set();
    const allChanges = [];

    for (const importPath of imports) {
        const src = path.resolve(absProjectRoot, importPath);
        const dst = path.join(outputDir, path.basename(importPath));

        if (!fs.existsSync(src)) {
            // Declared source missing in project → skip this import
            logChange({ status: "SKIP", relative: importPath }, { verbose });
            continue;
        }

        const changes = scanDifferences(src, dst);

        for (const c of changes) {
            expectedPaths.add(path.resolve(c.dstPath));
            logChange(c, { verbose });
        }

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
