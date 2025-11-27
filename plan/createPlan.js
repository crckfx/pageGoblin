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
import { computeGraftData } from "../plugins/computeGraftData.js";


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
    

    // // ------------------ GRAFT STUFF -----------------------------

    const routedGrafts = routeGrafts(root, config.grafts, config.providers);
    // console.log(`found grafts: ${routedGrafts.length}. `);

    // Build output folder for grafts:
    const graftOutputDir = path.resolve(root, ".pageGoblin/graft");

    // decide if each graft needs rendering (along with some crude hashing)
    const graftStatus = {};
    for (const g of routedGrafts) {
        const graftOutFilePath = path.join(graftOutputDir, g.name);
        graftStatus[g.name] = scanGraft(g, goblinCache, graftOutFilePath);
    }

    // now we have a pretty good but crude picture about the grafts.
    // importantly, we don't know here if a graft's function output changed.
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
            const graftOutFilePath = page.graftOutFilePath || "index.html";
            const htmlFile = path.join(page.outDir, graftOutFilePath);
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
            for (const graftOutFilePath of Object.values(generate)) {
                // graftOutFilePath is something like "map.json"
                const abs = path.resolve(dist, graftOutFilePath);
                expectedPaths.add(abs);
            }
        }

    }
    // ------------------ /scanRenderEntry + scanEntryImports -----------------------------

    // unused tentative pre-constructed guy that we're trying to develop.
    // like, still unused, but beginning to resemble a fuller picture
    // of static things, and things to be mutated.
    const plan = {
        root: root,
        dist: dist,
        goblinCache: goblinCache,
        config: config,

        pages: allPages,

        providers: config.providers,
        grafts: routedGrafts,
        graftStatus: graftStatus,


        expectedPaths: expectedPaths,
        copyChanges: copyChanges,
        htmlChanges: htmlChanges,
        renderablePages: renderablePages,
        totalImports: totalImports,
    }

    // it feels cheap to do stuff AFTER plan declaration.
    // at this point, plan has been declared, and anything that writes to it is considered cheap mutation.
    
    // ----------------- GRAFT RENDERING -----------------
    // in order to have a function body output notify of changes, we (currently) need to compute the graft here, with the complete plan.
    for (const g of plan.grafts) {
        const status = plan.graftStatus[g.name];

        const cacheKey = status.outputPath;

        // ----- compute dynamic locals + fnOut -----
        const { locals, fnOutputHashes } = await computeGraftData(g, plan);

        // ----- compare fnOutHashes with cached -----
        const prev = plan.goblinCache.grafts[cacheKey] || {};
        const prevFn = prev.fnOutputHashes || {};
        const fnOutChanged = JSON.stringify(prevFn) !== JSON.stringify(fnOutputHashes);


        const finalNeedsRender = status.needsRender || fnOutChanged;

        // ----- store results directly on the existing status -----
        status.locals = locals;
        status.fnOutputHashes = fnOutputHashes;
        status.fnOutChanged = fnOutChanged;
        status.finalNeedsRender = finalNeedsRender;

    }

    // now that grafts are rendered up, we can return the plan
    return plan;

}