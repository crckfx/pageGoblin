// resolve-entry-imports.js
import path from "path";
import { compareEntry } from "./read/compare-entry.js";

export function resolveEntryImports(root, page, expectedPaths, verbose) {
    const { outputPath, imports = [], pageId } = page;
    const result = compareEntry(root, page, { verbose, pageId });

    // collect results
    result.expectedPaths.forEach((p) => expectedPaths.add(p));
    if (outputPath) expectedPaths.add(path.resolve(root, outputPath));

    // expected import destinations
    if (outputPath) {
        const outputDir = path.resolve(root, path.dirname(outputPath));
        for (const importPath of imports) {
            expectedPaths.add(path.resolve(path.join(outputDir, path.basename(importPath))));
        }
    }
    return result;
}
