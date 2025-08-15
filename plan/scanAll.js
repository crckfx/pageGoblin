import path from "path";
import { flattenPages } from "../adapter/flatten-pages.js";
import { loadJSON } from "../etc/helpers.js";
// import { resolveEntryImports } from "../read/resolve-entry-imports.js";
import { loadGoblinCache } from "../etc/cache-utils.js";
import { scanRenderEntry } from "./scanRenderEntry.js";
import { inflateArticlesToPages } from "../adapter/articles-adapter.js";

export async function scanAll(projectRoot, distRoot, config, verbose = false) {
    const root = path.resolve(projectRoot);
    const dist = path.resolve(distRoot);

    // pagesJsonPath is guaranteed absolute by config loader
    const pagesMain = flattenPages(await loadJSON(config.pagesJsonPath));

    let articlePages = [];
    if (config.articlesJsonPath) {
        const articlesObj = await loadJSON(config.articlesJsonPath);
        articlePages = inflateArticlesToPages(articlesObj, config);
    }

    const pages = [...pagesMain, ...articlePages];
    const goblinCache = loadGoblinCache(root);

    const expectedPaths = new Set();
    const copyChanges = [];
    const htmlChanges = [];
    let totalScanned = 0;

    for (const page of pages) {
        // ONE-TIME normalization per page: URL → absolute FS path (no regex, no helpers)
        page.outputPath = path.resolve(dist, "." + page.outputPath);

        const html = scanRenderEntry(root, page, config, goblinCache);
        html.forEach(change => expectedPaths.add(change.outputPath));
        htmlChanges.push(...html);

        const { scanned, changes } = resolveEntryImports(root, page, expectedPaths, verbose);
        totalScanned += scanned;
        copyChanges.push(...changes);
    }

    return {
        root, dist, pages, config,
        goblinCache,
        expectedPaths,
        copyChanges,
        htmlChanges,
        totalScanned
    };
}




// import path from "path";
import { compareEntry } from "../transfer/compare-entry.js";

function resolveEntryImports(root, page, expectedPaths, verbose) {
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
