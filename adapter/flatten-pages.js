import { ensureArray } from "../etc/helpers.js";

/**
 * Recursively flattens a nested structure into page-like entries.
 * Applies profile-level rules (contentRule, outDirRule, templatePath, styles).
 */
export function flattenPages(pages, ancestry = [], depth = 0, profile = {}) {
    const result = [];

    for (const [pageId, config] of Object.entries(pages)) {
        const currentPath = [...ancestry, pageId];
        const navPath = currentPath.join("/");

        // infer contentPath
        let contentPath;
        if (config.contentPath) {
            contentPath = ensureArray(config.contentPath);
        } else if (profile.contentRule) {
            contentPath = [
                profile.contentRule
                    .replace(/\{id\}/g, pageId)
                    .replace(/\{navPath\}/g, navPath)
            ];
        } else {
            contentPath = [];
        }

        // infer outDir
        const inferredOutDir = "/" + navPath;
        const outDirFromRule = profile.outDirRule
            ? profile.outDirRule
                .replace(/\{id\}/g, pageId)
                .replace(/\{navPath\}/g, navPath)
            : null;

        const outDir = config.outDir ?? outDirFromRule ?? inferredOutDir;
        
        let url = outDir;
        // Ensure leading slash
        if (!url.startsWith("/")) url = "/" + url;
        // Root must stay exactly "/"
        if (url !== "/" && !url.endsWith("/")) url = url + "/";


        const flattened = {
            ...config,
            pageId,
            outDir: outDir,
            url: url, // parallel url one that WON'T get overwritten perhaps
            ...(config.outFile ? { outFile: config.outFile } : {}),
            contentPath,
            styles: ensureArray(profile.styles).concat(ensureArray(config.styles)),
            scripts: ensureArray(profile.scripts).concat(ensureArray(config.scripts)),
            modules: ensureArray(profile.modules).concat(ensureArray(config.modules)),
            imports: ensureArray(config.imports), // no merge
            templatePath: config.templatePath ?? profile.templatePath,
            navPath: currentPath,
            depth,
            profile
        };

        result.push(flattened);

        if (config.children) {
            result.push(...flattenPages(config.children, currentPath, depth + 1, profile));
        }
    }

    return result;
}
