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


export function scanRenderEntry(root, page, config, goblinCache, graftStatus) {
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
    page.graftsUsed = [];

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

            page.graftsUsed.push(graftName);

            const gs = graftStatus?.[graftName];

            // hashing
            inputHashes[key] = filePath; // should be something like "graft:something.html"

            // IMPORTANT: replace the fragment in place
            if (gs?.outputPath) {
                page.fragments[key] = gs.outputPath;
            }
            if (gs?.needsRender) {
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

    // page.contentPath is guaranteed to be an array
    let combinedContent = "";
    for (let i = 0; i < page.contentPath.length; i++) {
        try {
            const abs = path.resolve(root, page.contentPath[i]);
            combinedContent += fs.readFileSync(abs, "utf8"); + "\n";
        } catch {
            combinedContent += "";
        }
    }
    const pageContentHash = hashText(combinedContent);
    inputHashes.page = pageContentHash;

    // scripts, styles, modules are guaranteed arrays
    for (const key of ["scripts", "styles", "modules"]) {
        inputHashes[key] = hashText(JSON.stringify(page[key]));
    }


    // Compare to cache (dry run: do not mutate cache here)
    const prev = goblinCache.pages[cacheKey];
    const changed = !prev || graftTriggered || JSON.stringify(prev.inputHashes) !== JSON.stringify(inputHashes);

    return {
        changed,
        dstPath, 
        inputHashes, 
        cacheKey,
    }

}
