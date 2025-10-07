// plan/createPlan.js
import path from "path";
import { flattenPages } from "../adapter/flatten-pages.js";
import { loadJSON } from "../etc/helpers.js";
import { loadGoblinCache } from "../etc/cache-utils.js";
import { scanRenderEntry } from "./scanRenderEntry.js";
import { scanEntryImports } from "./scanEntryImports.js";

export async function createPlan(projectRoot, distRoot, config, verbose = false) {
    const root = path.resolve(projectRoot);
    const dist = path.resolve(distRoot);
    const goblinCache = loadGoblinCache(root);

    const allPages = [];

    for (const src of config.sources) {
        const profile = config.profiles[src.profile];
        if (!profile)
            throw new Error(`Unknown profile "${src.profile}" in config.sources`);

        const data = await loadJSON(src.path);
        const entries = flattenPages(data, [], 0, profile);
        allPages.push(...entries);
    }

    const expectedPaths = new Set();
    const copyChanges = [];
    const htmlChanges = [];
    let totalScanned = 0;

    for (const page of allPages) {
        page.outDir = path.resolve(dist, "." + page.outDir);
        const outFile = page.outFile || "index.html";

        if (page.contentPath) {
            const htmlFile = path.join(page.outDir, outFile);
            expectedPaths.add(htmlFile);
        }

        const html = scanRenderEntry(root, page, config, goblinCache);
        htmlChanges.push(...html);

        const { scanned, changes, expectedPaths: importExpected } =
            scanEntryImports(root, page, { verbose, pageId: page.pageId });

        totalScanned += scanned;
        copyChanges.push(...changes);
        importExpected.forEach((p) => expectedPaths.add(p));
    }

    return {
        root,
        dist,
        pages: allPages,
        config,
        goblinCache,
        expectedPaths,
        copyChanges,
        htmlChanges,
        totalScanned
    };
}
