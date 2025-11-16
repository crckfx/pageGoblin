// plugins/mapGenerator.js
import fs from "fs/promises";
import path from "path";

/**
 * Generate map.json from the canonical plan.
 * Does not rely on cache for URL derivation.
 */
export async function generateMap_JSON({ plan, distRoot, outputPath }) {
    console.log("[map_JSON] === generator start ===");
    console.log("[map_JSON] distRoot:", distRoot);

    const urls = Object.create(null);

    // ------------------------------------------------------------
    // Pass 1: Add all real pages (those with hasIndex == true)
    // ------------------------------------------------------------
    for (const page of plan.pages) {
        if (!Array.isArray(page.contentPath) || page.contentPath.length === 0) {
            continue; // no HTML output
        }

        const outFile = page.outFile || "index.html";
        const absHtml = path.join(page.outDir, outFile).replace(/\\/g, "/");

        // Derive URL from distRoot
        let rel = path.relative(distRoot, absHtml).replace(/\\/g, "/");

        if (rel.endsWith(outFile)) {
            rel = rel.slice(0, -outFile.length);
        }

        let url = rel.replace(/\/+$/, "");
        url = url === "" ? "/" : "/" + url + "/";
        url = url.replace(/\/+$/, "/");

        const title = page.title || "Untitled Page";

        urls[url] = {
            hasIndex: true,
            title,
            navPath: page.navPath || [],
            pageId: page.pageId || null
        };
    }

    console.log("[map_JSON] real URL count:", Object.keys(urls).length);

    // ------------------------------------------------------------
    // Pass 2: Synthesize parent directories with hasIndex = false
    // ------------------------------------------------------------
    for (const url of Object.keys(urls)) {
        let parent = parentUrl(url);
        while (parent) {
            if (!urls[parent]) {
                urls[parent] = {
                    hasIndex: false,
                    title: "Untitled Page",
                    navPath: [],
                    pageId: null
                };
            }
            parent = parentUrl(parent);
        }
    }

    // ------------------------------------------------------------
    // Sort for stability
    // ------------------------------------------------------------
    const sorted = {};
    for (const key of Object.keys(urls).sort()) {
        sorted[key] = urls[key];
    }

    console.log("[map_JSON] final URL count:", Object.keys(sorted).length);
    console.log("[map_JSON] writing:", outputPath);

    await fs.writeFile(outputPath, JSON.stringify({ urls: sorted }, null, 2) + "\n");

    console.log("[map_JSON] === generator end ===");
}


// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function parentUrl(url) {
    if (url === "/") return null;

    const trimmed = url.replace(/\/+$/, "");
    const idx = trimmed.lastIndexOf("/");
    if (idx <= 0) return "/";

    return trimmed.slice(0, idx) + "/";
}
