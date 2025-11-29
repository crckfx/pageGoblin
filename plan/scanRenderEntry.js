// plan/scanRenderEntry.js
import fs from "fs";
import path from "path";
import { hashText } from "../etc/cache-utils.js";

function mergeFragmentsForPage(config, page) {
    const merged = { ...config.fragments };

    // profile layer
    const pf = page.profile?.fragments || {};
    for (const [k, v] of Object.entries(pf)) {
        if (v === null) delete merged[k];
        else merged[k] = v;
    }

    // page layer
    const pg = page.fragments || {};
    for (const [k, v] of Object.entries(pg)) {
        if (v === null) delete merged[k];
        else merged[k] = v;
    }

    return merged;
}


export function scanRenderEntry(root, page, config, goblinCache, grafts) {
    // No HTML to render for this entry
    if (!page.contentPath || page.contentPath.length === 0) return [];

    let graftTriggered = false;
    // Resolve destination file (absolute)
    const outFile = path.basename(page.outFile || "index.html"); // guard against path segments
    const outDirAbs = path.isAbsolute(page.outDir)
        ? page.outDir
        : path.resolve(root, page.outDir || "");
    const dstPath = path.join(outDirAbs, outFile);

    // Cache key keyed by destination file (stable per location)
    const cacheKey = dstPath; // already absolute

    // Hash inputs (missing files hash to null; we still diff the shape)
    const inputHashes = {};
    // Collect fragments (paths) for later render
    page.fragments = mergeFragmentsForPage(config, page);
    // page.graftsUsed = [];

    // Hash template + fragments together
    const fileInputs = {
        template: page.templatePath ?? config.templatePath,
        ...page.fragments
    };

    for (const [key, filePath] of Object.entries(fileInputs)) {
        if (!filePath) continue;

        // ----------------- graft specifier? -----------------
        if (typeof filePath === "string" && filePath.startsWith("graft:")) {
            const graftName = filePath.slice("graft:".length);

            // page.graftsUsed.push(graftName);

            const gs = grafts?.[graftName]?.status;

            // hashing
            inputHashes[key] = filePath; // should be something like "graft:something.html"

            // IMPORTANT: replace the fragment in place
            if (gs?.outputPath) {
                page.fragments[key] = gs.outputPath;
            }
            if (gs?.finalNeedsRender) {
                graftTriggered = true;
            }

            continue;
        }

        // ----------------- normal file -----------------
        try {
            const abs = path.resolve(root, filePath);
            const content = fs.readFileSync(abs, "utf8");
            inputHashes[key] = hashText(content);
        } catch {
            inputHashes[key] = null;
        }
    }

    // page.contentPath is already guaranteed to be an array
    let combinedContent = "";
    for (let i = 0; i < page.contentPath.length; i++) {
        const cPath = page.contentPath[i];
        if (cPath.startsWith("graft:")) {
            const name = cPath.slice("graft:".length);
            // console.log(`found an unhandled contentPath graft! (at ${dstPath} - ${name})`);
            const gs = grafts?.[name]?.status;
            // console.log(gs);
            if (gs?.finalNeedsRender) {
                // console.log(`AND this graft (${name}) needs rerender! (setting 'graftTriggered = true')`);
                // console.log(gs);
                graftTriggered = true;
            }
            // the path gets fixed, but it doesn't detect a render needed (doesn't precompute a graft output)
            if (gs?.outputPath) {
                page.contentPath[i] = gs.outputPath;
            }
        } else {
            try {
                const abs = path.resolve(root, cPath);
                combinedContent += fs.readFileSync(abs, "utf8"); + "\n";
            } catch {
                combinedContent += "";
            }
        }
    }
    const pageContentHash = hashText(combinedContent);
    inputHashes.page = pageContentHash;

    // scripts, styles, modules are guaranteed arrays
    for (const key of ["scripts", "styles", "modules"]) {
        inputHashes[key] = hashText(JSON.stringify(page[key]));
    }

    // compare to cache but don't mutate it
    // this ^ is true, but please remember: (!)
    //  - the real cache file is only written during "if write" phase.
    //  - the cache we "DO NOT MUTATE" here is the plan's cache in memory, not the file on disk;
    //      there's no writing to file unless this plan makes it to "if (write)"
    const prev = goblinCache.pages[cacheKey];
    const changed = !prev || graftTriggered || JSON.stringify(prev.inputHashes) !== JSON.stringify(inputHashes);

    return {
        changed,
        dstPath,
        inputHashes,
        cacheKey,
    }

}
