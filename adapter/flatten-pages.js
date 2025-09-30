import { ensureArray } from "../etc/helpers.js";
/**
 * Recursively flattens the nested pages structure into a flat array.
 * Adds inferred outDir if missing (as a WEB path: "/.../index.html").
 * Tracks depth and navigation path for printing.
 */
export function flattenPages(pages, ancestry = [], depth = 0) {
    const result = [];

    for (const [pageId, config] of Object.entries(pages)) {
        const currentPath = [...ancestry, pageId];

        // Inferred as site-root URL (no "dist/", no OS-specific joins)
        const inferredOutDir = "/" + currentPath.join("/");

        const flattened = {
            ...config,
            outDir: config.outDir ?? inferredOutDir,   // web directory
            ...(config.outFile ? { outFile: config.outFile } : {}), // optional custom filename

            scripts: ensureArray(config.scripts),
            modules: ensureArray(config.modules),
            styles: ensureArray(config.styles),

            contentPath: ensureArray(config.contentPath),
            imports: ensureArray(config.imports),

            navPath: currentPath,
            navId: currentPath[0],
            depth,
            pageId,
        };

        result.push(flattened);

        if (config.children) {
            const children = flattenPages(config.children, currentPath, depth + 1);
            result.push(...children);
        }
    }

    return result;
}
