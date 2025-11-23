import path from "path";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { ensureDir } from "./helpers.js";
import crypto from "crypto";

// ─── Hash Helper ───
export function hashText(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}

/**
 * Load the full structured cache:
 * {
 *   pages: { ... },
 *   grafts: { ... },
 *   dist: "<abs path>"
 * }
 *
 * If file missing or malformed, return empty maps.
 */
export function loadGoblinCache(root) {
    const dir = path.join(root, ".pageGoblin");
    ensureDir(dir);

    const file = path.join(dir, "cache.json");
    if (!existsSync(file)) {
        return { pages: {}, grafts: {}, dist: "" };
    }

    try {
        const json = JSON.parse(readFileSync(file, "utf8"));
        return {
            pages: json.pages ?? {},
            grafts: json.grafts ?? {},
            dist: json.dist ?? ""
        };
    } catch {
        return { pages: {}, grafts: {}, dist: "" };
    }
}

/**
 * Save the full structured cache.
 * Callers must pass a single object with { pages, grafts, dist }.
 */
export function saveGoblinCache(root, cacheObj) {
    const dir = path.join(root, ".pageGoblin");
    ensureDir(dir);

    const file = path.join(dir, "cache.json");

    const toWrite = {
        dist: cacheObj.dist ?? "",
        pages: cacheObj.pages ?? {},
        grafts: cacheObj.grafts ?? {}
    };

    writeFileSync(file, JSON.stringify(toWrite, null, 2));
}
