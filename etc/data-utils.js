import { readTextFile } from "./helpers.js";
export async function resolveFragments(fragments) {
    const out = {};
    for (const [key, filePath] of Object.entries(fragments || {})) {
        if (!filePath) continue;
        out[key] = await readTextFile(filePath);
    }
    return out;
}

export function wrapTags(items, template) {
    if (!items) return "";
    const arr = Array.isArray(items) ? items : [items];
    return arr.map(template).join("\n");
}