// plan/createPlan.js
import path from "path";
import { flattenPages } from "../adapter/flatten-pages.js";
import { loadJSON } from "../etc/helpers.js";
import { loadGoblinCache } from "../etc/cache-utils.js";
import { scanRenderEntry } from "./scanRenderEntry.js";
import { scanEntryImports } from "./scanEntryImports.js";
import { processGrafts } from "../plugins/processGrafts.js";


export async function createPlan(projectRoot, distRoot, config, verbose = false) {
    // prepare allPages (as in, resolve and flatten whatever 'pages' sources the config lists)
    const allPages = [];
    for (const src of config.sources) {
        const profile = config.profiles[src.profile];
        if (!profile)
            throw new Error(`Unknown profile "${src.profile}" in config.sources`);
        const data = await loadJSON(src.path);
        const entries = flattenPages(data, [], 0, profile); // flatten pages per sourceList
        allPages.push(...entries);
    }

    const root = path.resolve(projectRoot);
    const dist = path.resolve(distRoot);
    const goblinCache = loadGoblinCache(root);

    // ------------------ BUILD CONTEXT -----------------------------
    // this defines the data that gets handed over to graft logic
    // (specific use case is generating a header menu nav from the pages list)
    const buildContext = {
        root: root,
        pages: allPages,
        config: config,
    }

    // ------------------ GRAFT STUFF -----------------------------
    
    const routedGrafts = await processGrafts({ buildContext, graftList: config.grafts, providersList: config.providers, goblinCache });
    
    // console.log(routedGrafts);
    // console.log(fake_routed_grafts);
    // const routedGrafts = routeGrafts(root, config.grafts, config.providers);
    // ------------------ /GRAFT STUFF -----------------------------


    // ------------------ scanRenderEntry + scanEntryImports -----------------------------
    const expectedPaths = new Set();
    const copyChanges = [];
    const htmlChanges = [];
    let renderablePages = 0;
    let totalImports = 0;

    for (const page of allPages) {
        page.outDir = path.resolve(dist, "." + page.outDir);

        if (Array.isArray(page.contentPath) && page.contentPath.length > 0) {
            const outFile = page.goutFile || "index.html";
            const htmlFile = path.join(page.outDir, outFile);
            expectedPaths.add(htmlFile);
            // modifying to return now return data on empty too
            const html = scanRenderEntry(root, page, config, goblinCache, routedGrafts);
            htmlChanges.push(html);

            renderablePages++;
        }

        const { scanned, changes, expectedPaths: importExpected } =
            scanEntryImports(root, page, { verbose, pageId: page.pageId });

        totalImports += scanned;
        copyChanges.push(...changes);
        importExpected.forEach((p) => expectedPaths.add(p));

        // 'preserve' flag from config
        // these are otherwise unhandled files that aren't part of the plan but shouldn't be cleaned
        const preserve = config.flags?.preserve;
        if (Array.isArray(preserve)) {
            for (const rel of preserve) {
                expectedPaths.add(path.resolve(distRoot, rel));
            }
        }

        // 'generate' flag from config
        // (it produces files that shouldn't be cleaned; so they're 'preserved')
        const generate = config.flags?.generate;
        if (generate && typeof generate === "object") {
            for (const graftOutFilePath of Object.values(generate)) {
                // graftOutFilePath is something like "map.json"
                const abs = path.resolve(dist, graftOutFilePath);
                expectedPaths.add(abs);
            }
        }

    }
    // ------------------ /scanRenderEntry + scanEntryImports -----------------------------

    const plan = {
        root: root,
        dist: dist,
        goblinCache: goblinCache,
        config: config,

        pages: allPages,

        providers: config.providers,
        grafts: routedGrafts,

        expectedPaths: expectedPaths,
        copyChanges: copyChanges,
        htmlChanges: htmlChanges,
        renderablePages: renderablePages,
        totalImports: totalImports,
    }


    return plan;

}