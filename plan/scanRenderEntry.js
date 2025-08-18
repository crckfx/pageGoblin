// plan/scanRenderEntry.js
import fs from "fs";
import path from "path";
import { hashText } from "../etc/cache-utils.js";


export function scanRenderEntry(root, page, config, goblinCache) {
    // No HTML to render for this entry
    if (!page.contentPath) return [];

    // Resolve destination file (absolute)
    const outFile = path.basename(page.outFile || "index.html"); // guard against path segments
    const outDirAbs = path.isAbsolute(page.outDir)
        ? page.outDir
        : path.resolve(root, page.outDir || "");
    const dstPath = path.join(outDirAbs, outFile);

    // Cache key keyed by destination file (stable per location)
    const cacheKey = dstPath; // already absolute

    // Gather render-relevant inputs (project-relative to root)
    const inputFiles = {
        template: page.templatePath ?? config.templatePath,
        page: page.contentPath,
        head: page.headContentPath ?? config.headContentPath,
        header: page.headerPath ?? config.headerPath,
        footer: page.footerPath ?? config.footerPath,
        global: page.globalHtmlPath ?? config.globalHtmlPath ?? undefined,
    };

    // Hash inputs (missing files hash to null; we still diff the shape)
    const inputHashes = {};
    for (const [key, filePath] of Object.entries(inputFiles)) {
        if (!filePath) continue;
        try {
            const abs = path.resolve(root, filePath);
            const content = fs.readFileSync(abs, "utf8");
            inputHashes[key] = hashText(content);
        } catch {
            inputHashes[key] = null;
        }
    }

    // Compare to cache (dry run: do not mutate cache here)
    const prev = goblinCache[cacheKey];
    const changed = !prev || JSON.stringify(prev.inputHashes) !== JSON.stringify(inputHashes);

    return changed
        ? [{ status: "RENDER", dstPath, inputHashes, cacheKey }]
        : [];
}
