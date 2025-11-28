// execute/writeFromPlan.js
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { logChange } from "../etc/helpers.js";
import { ensureDir } from "../etc/helpers.js";
import { renderPage } from "../render/renderPage.js";
import { writeGraft } from "../plugins/writeGraft.js";


export async function writeFromPlan(plan, { verbose = false } = {}) {
    const {
        root, pages, config,
        goblinCache, expectedPaths,
        htmlChanges, copyChanges,
    } = plan;

    let totalRendered = 0;
    let totalWritten = 0;

    // graft renders
    for (const g of plan.grafts) {
        const gs = plan.graftStatus[g.name];
        if (!gs || !gs.finalNeedsRender) continue;

        await writeGraft({
            template: g.template,      // from the original graft definition
            outputPath: gs.outputPath, // from scan/resolve
            locals: gs.locals || {},   // from computeGraftData
        });

        // update cache after successful write
        plan.goblinCache.grafts[gs.outputPath] = {
            inputHashes: gs.inputHashes,
            combinedHash: gs.combinedHash,
            fnOutputHashes: gs.fnOutputHashes,
        };

        // if (verbose) 
        console.log(`Graft rendered: ${gs.outputPath}`);
    }



    // HTML renders
    for (const { dstPath, inputHashes, cacheKey, changed } of htmlChanges) {
        if (!changed) continue;

        const page = pages.find(p => {
            const target = path.join(p.outDir, p.outFile || "index.html");
            return target === dstPath;
        });
        if (!page) continue;

        const didRender = await renderEntry(root, page, config, verbose);
        if (didRender) {
            const prev = goblinCache.pages[cacheKey] || {};
            // keep any other fields, update hashes, and CLEAR job marks
            goblinCache.pages[cacheKey] = { ...prev, inputHashes, jobs: {} };
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



function applyChanges(changes) {
    const written = [];

    for (const change of changes) {
        if (change.status === "MATCHES") continue;

        ensureDir(path.dirname(change.dstPath));
        fs.copyFileSync(change.srcPath, change.dstPath);

        written.push({
            status: "WRITTEN",
            relative: change.relative,
            srcPath: change.srcPath,
            dstPath: change.dstPath,
        });
    }

    return written;
}


async function renderEntry(root, page, config, verbose) {
    const {
        title, contentPath, outDir, outFile, pageId,
        styles = [], scripts = [], modules = [],
        navPath = null, image = null,
    } = page;

    if (!contentPath || !outDir) {
        if (verbose) console.warn(chalk.gray(`[SKIP] ${pageId}: no contentPath or outDir`));
        return false;
    }

    // handle multiple contentPaths
    let contentAbs = [];
    if (page.contentPath) {
        const paths = Array.isArray(page.contentPath) ? page.contentPath : [page.contentPath];
        for (let i = 0; i < paths.length; i++) {
            const abs = path.resolve(root, paths[i]);
            if (!fs.existsSync(abs)) {
                console.warn(chalk.red(`[MISSING] ${pageId}: ${paths[i]}`));
                return false;
            }
            contentAbs.push(abs);
        }
    }

    const fragments = {};
    if (page.fragments && typeof page.fragments === "object") {
        for (const [k, v] of Object.entries(page.fragments)) {
            if (v === null) continue; // null suppresses
            fragments[k] = path.isAbsolute(v) ? v : path.resolve(root, v);
        }
    }


    const templatePath = path.resolve(root, page.templatePath ?? config.templatePath);

    await renderPage({
        title,
        contentPath: contentAbs, // now an array
        outDir: path.isAbsolute(outDir) ? outDir : path.resolve(root, outDir),
        outFile: outFile || "index.html",
        templatePath,
        scripts,
        modules,
        styles,
        navPath,
        image,
        pageId,
        fragments,
    });

    return true;
}
