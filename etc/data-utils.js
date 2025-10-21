import { readTextFile } from "./helpers.js";

// specifically for use in renderPage, apparently? read objectKey:path into objectKey:content ..???
export async function resolveFragments(fragments) {
    const out = {};
    for (const [key, filePath] of Object.entries(fragments || {})) {
        if (!filePath) continue;
        out[key] = await readTextFile(filePath);
    }
    return out;
}

// for 'styles', 'scripts', 'modules' type data
export function wrapTags(items, template) {
    if (!items) return "";
    const arr = Array.isArray(items) ? items : [items];
    return arr.map(template).join("\n");
}