
import fs from "fs";
import path from "path";

import { logChange, walkAllFiles } from "../etc/helpers.js";

export function cleanFromPlan(plan) {
    const { dist, expectedPaths, goblinCache } = plan;

    let totalDeleted = 0;
    const deletedHtmlKeys = [];

    for (const abs of walkAllFiles(dist)) {
        if (!expectedPaths.has(abs)) {
            logChange({ status: "DELETE", relative: path.relative(dist, abs) });
            fs.unlinkSync(abs);
            totalDeleted++;

            // If an HTML render target was deleted, prune its cache entry
            const absResolved = path.resolve(abs);
            if (goblinCache.pages[absResolved]) {
                deletedHtmlKeys.push(absResolved);
            }
        }
    }

    // Remove any cache entries for deleted html outputs
    let cacheModified = false;
    if (deletedHtmlKeys.length > 0) {
        for (const key of deletedHtmlKeys) delete goblinCache[key];
        cacheModified = true;
    }

    return { totalDeleted, cacheModified };
}