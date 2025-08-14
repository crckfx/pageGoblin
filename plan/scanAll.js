
import path from "path";

import { flattenPages } from "../read/flatten-pages.js";
import { loadJSON } from "../etc/helpers.js";
import { resolveEntryImports } from "../read/resolve-entry-imports.js";
import { loadGoblinCache, saveGoblinCache } from "../etc/cache-utils.js";
import { scanRenderEntry } from "../read/scanRenderEntry.js";
import { inflateArticlesToPages } from "../adapter/articles-adapter.js";

export async function scanAll(projectRoot, distRoot, pagesJsonPath, configPath, verbose = false) {
    const root = path.resolve(projectRoot);
    const dist = path.resolve(distRoot);

    const rawConfig = await loadJSON(configPath);
    const config = rawConfig.default ? { ...rawConfig, ...rawConfig.default } : rawConfig;
    delete config.default;

    // base pages (existing behavior)
    const pagesMain = flattenPages(await loadJSON(pagesJsonPath));

    // optional articles from config.articlesJsonPath (can be null/undefined)
    let articlePages = [];
    if (config.articlesJsonPath) {
        const articlesPath = path.resolve(root, config.articlesJsonPath);
        const articlesObj = await loadJSON(articlesPath);
        articlePages = inflateArticlesToPages(articlesObj, config);
    }

    // unified list for scanning
    const pages = [...pagesMain, ...articlePages];

    const goblinCache = loadGoblinCache(root);

    const expectedPaths = new Set();
    const copyChanges = [];  // asset/import copy operations
    const htmlChanges = [];  // planned html renders [{ status:'RENDER', dstPath, cacheKey, inputHashes }]
    let totalScanned = 0;

    for (const page of pages) {
        // Plan HTML renders; record their outputs as expected
        const html = scanRenderEntry(root, page, config, goblinCache);
        html.forEach(change => expectedPaths.add(change.dstPath));
        htmlChanges.push(...html);

        // Plan import/copy operations; also populates expectedPaths
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