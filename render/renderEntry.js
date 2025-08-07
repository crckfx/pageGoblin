// render/renderEntry.js
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { renderPage } from "./renderPage.js";

export async function renderEntry(root, page, config, verbose) {
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
