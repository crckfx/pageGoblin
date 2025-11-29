import { ensureArray } from "../etc/helpers.js";

/**
 * Recursively flattens a nested structure into page-like entries.
 * Applies profile-level rules (contentRule, outDirRule, templatePath, styles).
 */
export function flattenPages(pages, ancestry = [], depth = 0, profile = {}) {
    const result = [];

    const profileStyles = ensureArray(profile.styles);
    const profileScripts = ensureArray(profile.scripts);
    const profileModules = ensureArray(profile.modules);

    for (const [pageId, data] of Object.entries(pages)) {
        const currentPath = [...ancestry, pageId];
        const navPath = currentPath.join("/");

        // infer contentPath
        let contentPath;
        if (data.contentPath) {
            contentPath = ensureArray(data.contentPath);
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

        const outDir = data.outDir ?? outDirFromRule ?? inferredOutDir;
        
        let url = outDir;
        // Ensure leading slash
        if (!url.startsWith("/")) url = "/" + url;
        // Root must stay exactly "/"
        if (url !== "/" && !url.endsWith("/")) url = url + "/";


        const flattened = {
            ...data,
            pageId,
            outDir,
            url: url, // parallel url one that WON'T get overwritten perhaps
            ...(data.outFile ? { outFile: data.outFile } : {}),
            contentPath,
            styles: profileStyles.concat(ensureArray(data.styles)),
            scripts: profileScripts.concat(ensureArray(data.scripts)),
            modules: profileModules.concat(ensureArray(data.modules)),
            imports: ensureArray(data.imports), // no merge because it's not handle at a data level
            templatePath: data.templatePath ?? profile.templatePath,
            navPath: currentPath,
            depth,
            profile
        };

        result.push(flattened);

        if (data.children) {
            result.push(...flattenPages(data.children, currentPath, depth + 1, profile));
        }
    }

    return result;
}
