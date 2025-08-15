import path from "path";
import { flattenPages } from "../read/flatten-pages.js";
import { loadJSON } from "../etc/helpers.js";
import { resolveEntryImports } from "../read/resolve-entry-imports.js";
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
