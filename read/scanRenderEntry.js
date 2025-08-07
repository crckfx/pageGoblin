import fs from "fs";
import path from "path";
import { hashText } from "../etc/cache-utils.js";



// ─── Scan Render Step ───
export function scanRenderEntry(root, page, config, goblinCache) {
    const dstPath = page.outputPath;
    const cacheKey = path.resolve(dstPath || "[no-output]");

    const inputFiles = {
        template: page.templatePath ?? config.templatePath,
        page: page.contentPath,
        head: page.headContentPath ?? config.headContentPath,
        header: page.headerPath ?? config.headerPath,
        footer: page.footerPath ?? config.footerPath,
        global: page.globalHtmlPath ?? config.globalHtmlPath ?? undefined,
    };

    const inputHashes = {};
    for (const [key, filePath] of Object.entries(inputFiles)) {
        if (!filePath) continue;
        try {
            const absPath = path.resolve(root, filePath);
            const content = fs.readFileSync(absPath, "utf8");
            inputHashes[key] = hashText(content);
        } catch {
            inputHashes[key] = null;
        }
    }

    const cached = goblinCache[cacheKey];
    const changed = !cached || JSON.stringify(cached.inputHashes) !== JSON.stringify(inputHashes);

    const changes = changed && dstPath
        ? [{ status: "RENDER", dstPath: path.resolve(root, dstPath), inputHashes, cacheKey }]
        : [];

    return changes;
}
