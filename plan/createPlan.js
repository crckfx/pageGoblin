// plan/createPlan.js
import path from "path";
import { flattenPages } from "../adapter/flatten-pages.js";
import { loadJSON } from "../etc/helpers.js";
import { loadGoblinCache } from "../etc/cache-utils.js";
import { scanRenderEntry } from "./scanRenderEntry.js";
import { scanEntryImports } from "./scanEntryImports.js";
import { routeGrafts } from "../plugins/graft-router.js";
import { pathToFileURL } from "url";
import { scanGraft } from "../plugins/scanGraft.js";


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
    let renderablePages = 0;
    let totalImports = 0;

    const htmlGregs = [];

    // ------------------ GRAFT STUFF -----------------------------
    // console.log(config.grafts);

    let providers = {};
    if (config.providersFile) {
        const abs = path.resolve(projectRoot, config.providersFile);
        const fileUrl = pathToFileURL(abs).href;
        try {
            const m = await import(fileUrl);
            // console.log("raw imported module:", m);
            providers = m;
        } catch (err) {
            // console.log("import error:", err);
            providers = {};
        }
    }
    // console.log("providers:", providers);

    const routedGrafts = routeGrafts(projectRoot, config.grafts, providers);
    // console.log(`found grafts: ${routedGrafts.length}. `);

    // Build output folder for grafts:
    const graftOutputDir = path.resolve(root, ".pageGoblin/graft");

    const graftStatus = {};

    // decide if each graft needs rendering (along with some crude hashing)
    for (const g of routedGrafts) {
        const outFile = path.join(graftOutputDir, g.name);
        graftStatus[g.name] = scanGraft(g, goblinCache, outFile);
    }

    // now we have a pretty good but crude picture about the grafts.
    // importantly, we don't know here if a graft's function output changed.

    // ------------------ /GRAFT STUFF -----------------------------

    for (const page of allPages) {
        page.outDir = path.resolve(dist, "." + page.outDir);

        if (Array.isArray(page.contentPath) && page.contentPath.length > 0) {
            const outFile = page.outFile || "index.html";
            const htmlFile = path.join(page.outDir, outFile);
            expectedPaths.add(htmlFile);
            // modifying to return now return data on empty too
            const html = scanRenderEntry(root, page, config, goblinCache, graftStatus);
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
            for (const outFile of Object.values(generate)) {
                // outFile is something like "map.json"
                const abs = path.resolve(dist, outFile);
                expectedPaths.add(abs);
            }
        }

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
        renderablePages,
        totalImports,
        grafts: routedGrafts,
        graftStatus
    };
}
