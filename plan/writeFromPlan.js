
import path from "path";

import { applyChanges } from "../copy/write.js";
import { logChange } from "../etc/helpers.js";
import { renderEntry } from "../render/renderEntry.js";

export async function writeFromPlan(plan, { verbose = false } = {}) {
    const {
        root, pages, config,
        goblinCache, expectedPaths,
        htmlChanges, copyChanges
    } = plan;

    let totalRendered = 0;
    let totalWritten = 0;

    // HTML renders
    for (const { dstPath, inputHashes, cacheKey } of htmlChanges) {
        const page = pages.find(p => path.resolve(root, p.outputPath) === dstPath);
        if (!page) continue;

        const didRender = await renderEntry(root, page, config, verbose);
        if (didRender) {
            const prev = goblinCache[cacheKey] || {};
            // keep any other fields, update hashes, and CLEAR job marks
            goblinCache[cacheKey] = { ...prev, inputHashes, jobs: {} };
            totalRendered++;
            if (verbose) console.log(`Rendered ${dstPath}`);
        }
    }


    // Asset copies
    const pending = copyChanges.filter(c => c.status !== "MATCHES");
    const written = applyChanges(pending);
    written.forEach((entry) => {
        logChange({ ...entry, status: "WRITTEN" });
        expectedPaths.add(path.resolve(entry.dstPath));
    });
    totalWritten = written.length;

    return { totalRendered, totalWritten };
}