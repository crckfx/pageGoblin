import path from "path";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { ensureDir } from "./helpers.js";
import crypto from "crypto";

// ─── Cache Helpers ───
export function hashText(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}

/**
 * Load only the flat page cache map for the main build.
 * On disk, cache.json is { pages: {...}, dist: "<abs path>" }.
 * We return ONLY the flat map (json.pages), never the top-level object.
 */
export function loadGoblinCache(root) {
    const dir = path.join(root, ".pageGoblin");
    ensureDir(dir);
    const file = path.join(dir, "cache.json");
    if (!existsSync(file)) return {};
    const json = JSON.parse(readFileSync(file, "utf8"));
    return json && typeof json === "object" && typeof json.pages === "object" ? json.pages : {};
}

/**
 * Save the flat cache map and dist path to disk in the new shape:
 * { pages: <flat map>, dist: "<abs path>" }
 */
export function saveGoblinCache(root, pagesMap, distPath) {
    const file = path.join(root, ".pageGoblin", "cache.json");
    const data = {
        dist: typeof distPath === "string" ? distPath : "",
        pages: pagesMap || {}
    };
    writeFileSync(file, JSON.stringify(data, null, 2));
}