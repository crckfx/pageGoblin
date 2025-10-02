// render/renderPage.js
import { readFile, writeFile } from 'fs/promises';
import ejs from 'ejs';
import path from 'path';
import { ensureDir, isCLI } from '../etc/helpers.js';

// helper function to read file as utf8
const readTextFile = (filePath) => readFile(filePath, 'utf8');

// main function
export async function renderPage({
    title,
    contentPath,
    templatePath,
    outDir,
    outFile,
    fragments = {},
    scripts,
    modules,
    styles,
    navPath,
    articleId,
    image,
}) {
    // resolve destination from outDir/outFile (filename only; default index.html)
    const dstPath = path.join(
        path.isAbsolute(outDir) ? outDir : path.resolve(outDir || ''),
        path.basename(outFile || 'index.html')
    );

    // construct body (handle multiple contentPaths)
    let body = "";
    if (contentPath != null) {
        const paths = Array.isArray(contentPath) ? contentPath : [contentPath];
        let combined = "";
        for (let i = 0; i < paths.length; i++) {
            const text = await readTextFile(paths[i]);
            combined += text + "\n";
        }
        body = combined;
    }

    // resolve fragments generically (header, footer, etc.)
    const resolvedFragments = {};
    for (const [key, filePath] of Object.entries(fragments)) {
        if (!filePath) continue;
        resolvedFragments[key] = await readTextFile(filePath);
    }

    const scriptTags = (Array.isArray(scripts) ? scripts : [])
        .map(src => `<script src="${src}"></script>`)
        .join('\n');

    const moduleTags = (Array.isArray(modules) ? modules : [])
        .map(src => `<script type="module" src="${src}"></script>`)
        .join('\n');

    const styleTags = (Array.isArray(styles) ? styles : [])
        .map(href => `<link rel="stylesheet" href="${href}">`)
        .join('\n');

    // create the html
    const html = await ejs.renderFile(templatePath, {
        title: title ?? 'Untitled Page',
        body,
        ...resolvedFragments,
        scripts: scriptTags,
        modules: moduleTags,
        styles: styleTags,
        navPath,
        articleId,
        image,
    });

    // save the file
    ensureDir(path.dirname(dstPath));
    await writeFile(dstPath, html);
    console.log(`Rendered ${dstPath}`);
}

// CLI entry point (BROKEN by fragments)
if (isCLI(import.meta.url)) {

    const args = process.argv.slice(2);
    const [contentPath, templatePath, headContentPath, headerPath, footerPath, outDir, outFile = 'index.html'] = args;

    if (!contentPath || !templatePath || !headContentPath || !headerPath || !footerPath || !outDir) {
        console.log("error - one of your args is missing");
    } else {
        await renderPage({
            contentPath, templatePath, headContentPath, headerPath, footerPath, outDir, outFile
        });
    }
}
