import path from "path";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { ensureDir } from "./helpers.js";
import crypto from "crypto";

// ─── Cache Helpers ───
export function hashText(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}

export function loadGoblinCache(root) {
    const dir = path.join(root, ".pageGoblin");
    ensureDir(dir);
    const file = path.join(dir, "cache.json");
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
    return {};
}

export function saveGoblinCache(root, cache) {
    const file = path.join(root, ".pageGoblin", "cache.json");
    writeFileSync(file, JSON.stringify(cache, null, 2));
}