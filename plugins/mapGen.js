import fs from "fs/promises";
import path from "path";

function parentUrl(url) {
    if (url === "/") return null;
    const trimmed = url.replace(/\/+$/, "");
    const idx = trimmed.lastIndexOf("/");
    // "/feature" → parent "/"
    if (idx <= 0) return "/";
    return trimmed.slice(0, idx) + "/";
}


export async function generateMap_JSON({ plan, distRoot, outputPath, verbose = false }) {
    if (verbose) console.log("[map_JSON] === generator start ===");
    if (verbose) console.log("[map_JSON] distRoot:", distRoot);

    const urls = Object.create(null);

    // FIRST pass: add every page in plan.pages
    for (const page of plan.pages) {
        // page.outDir is already ABSOLUTE, so make it relative to distRoot
        let rel = path.relative(distRoot, page.outDir).replace(/\\/g, "/");

        rel = rel.replace(/\/+$/, ""); // trim trailing slash

        // "/" root special case
        let url = rel === "" ? "/" : "/" + rel + "/";

        // determine if hasIndex
        const hasIndex =
            Array.isArray(page.contentPath) &&
            page.contentPath.length > 0;

        // build this JSON entry
        urls[url] = {
            hasIndex,
            title: page.title || "Untitled Page",
            navPath: page.navPath || [],
            pageId: page.pageId || null
        };

        if (verbose) console.log("[map_JSON] page:", url, "title:", urls[url].title);
    }

    if (verbose) console.log("[map_JSON] metadata nodes:", Object.keys(urls).length);

    // SECOND pass: add missing parents that have no index and/or aren't considered "a page" yet
    for (const url of Object.keys(urls)) {
        let parent = parentUrl(url);

        while (parent) {
            if (!urls[parent]) {
                // console.log("[map_JSON] synth parent:", parent);

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


    // sort the data so the final output is nicely structured
    const sorted = {};
    for (const key of Object.keys(urls).sort()) {
        sorted[key] = urls[key];
    }

    if (verbose) console.log("[map_JSON] final URL count:", Object.keys(sorted).length);
    if (verbose) console.log("[map_JSON] writing:", outputPath);

    await fs.writeFile(
        outputPath,
        JSON.stringify({ urls: sorted }, null, 2) + "\n"
    );

    if (verbose) console.log("[map_JSON] === generator end ===");
}