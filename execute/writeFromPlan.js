
import path from "path";

// import { applyChanges } from "../copy/write.js";
import { logChange } from "../etc/helpers.js";
// import { renderEntry } from "../render/renderEntry.js";

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

import fs from 'fs';
// import path from 'path';
import { ensureDir } from '../etc/helpers.js';

function applyChanges(changes) {
    const written = [];

    for (const change of changes) {
        if (change.status === 'MATCHES') continue;

        ensureDir(path.dirname(change.dstPath));
        fs.copyFileSync(change.srcPath, change.dstPath);

        written.push({
            status: 'WRITTEN',
            relative: change.relative,
            srcPath: change.srcPath,
            dstPath: change.dstPath,
        });
    }

    return written;
}

// import path from "path";
// import fs from "fs";
import chalk from "chalk";
import { renderPage } from "../render/renderPage.js";
async function renderEntry(root, page, config, verbose) {
    const {
        title, contentPath, outputPath, pageId,
        imports = [], styles = [], scripts = [], modules = [],
        navPath = null, articleId = null, image = null,
    } = page;

    if (!contentPath || !outputPath) {
        if (verbose) console.warn(chalk.gray(`[SKIP] ${pageId}: no contentPath or outputPath`));
        return false;
    }

    const pagePath = path.resolve(root, contentPath);
    if (!fs.existsSync(pagePath)) {
        console.warn(chalk.red(`[MISSING] ${pageId}: ${contentPath}`));
        return false;
    }

    const templatePath = path.resolve(root, page.templatePath ?? config.templatePath);
    const headContentPath = path.resolve(root, page.headContentPath ?? config.headContentPath);
    const headerPath = path.resolve(root, page.headerPath ?? config.headerPath);
    const footerPath = path.resolve(root, page.footerPath ?? config.footerPath);
    const globalHtmlPath = (page.globalHtmlPath ?? config.globalHtmlPath)
        ? path.resolve(root, page.globalHtmlPath ?? config.globalHtmlPath)
        : null;

    await renderPage({
        title,
        pagePath,
        outputPath: path.resolve(root, outputPath),
        headContentPath,
        headerPath,
        footerPath,
        templatePath,
        scripts,
        modules,
        styles,
        globalHtmlPath,
        navPath,
        articleId,
        image,
    });

    return true;
}