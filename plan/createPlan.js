// plan/createPlan.js
import path from "path";
import { flattenPages } from "../adapter/flatten-pages.js";
import { loadJSON } from "../etc/helpers.js";
import { loadGoblinCache } from "../etc/cache-utils.js";
import { scanRenderEntry } from "./scanRenderEntry.js";
import { inflateArticlesToPages } from "../adapter/articles-adapter.js";
import { scanEntryImports } from "./scanEntryImports.js";

export async function createPlan(projectRoot, distRoot, config, verbose = false) {
    const root = path.resolve(projectRoot);
    const dist = path.resolve(distRoot);
    const goblinCache = loadGoblinCache(root);

    // pagesJsonPath is guaranteed absolute by the config loader
    const pagesMain = flattenPages(await loadJSON(config.pagesJsonPath));

    let articlePages = [];
    if (config.articlesJsonPath) {
        const articlesObj = await loadJSON(config.articlesJsonPath);
        articlePages = inflateArticlesToPages(articlesObj, config);
    }

    const pages = [...pagesMain, ...articlePages];

    const expectedPaths = new Set();
    const copyChanges = [];
    const htmlChanges = [];
    let totalScanned = 0;

    for (const page of pages) {
        // ONE-TIME normalization per page: WEB path → absolute FS path in dist
        // Example: "/a/b/index.html" → "<dist>/a/b/index.html"
        page.outputPath = path.resolve(dist, "." + page.outputPath);

        // Always expect the page's HTML to exist (whether or not it needs re-render)
        expectedPaths.add(page.outputPath);

        // Plan render work for this page
        const html = scanRenderEntry(root, page, config, goblinCache);
        html.forEach((change) => expectedPaths.add(change.outputPath));
        htmlChanges.push(...html);

        // Plan transfer (imports) for this page
        const { scanned, changes, expectedPaths: importExpected } =
            scanEntryImports(root, page, { verbose, pageId: page.pageId });

        totalScanned += scanned;
        copyChanges.push(...changes);
        importExpected.forEach((p) => expectedPaths.add(p));
    }

    return {
        root,
        dist,
        pages,
        config,
        goblinCache,
        expectedPaths,
        copyChanges,
        htmlChanges,
        totalScanned,
    };
}
