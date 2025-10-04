// render/renderPage.js
import { readFile, writeFile } from 'fs/promises';
import ejs from 'ejs';
import path from 'path';
import { ensureDir, readAndJoinTextFiles, readTextFile, resolveFragments, wrapTags } from '../etc/helpers.js';

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

    const body = await readAndJoinTextFiles(contentPath);
    const resolvedFragments = await resolveFragments(fragments);

    const scriptTags = wrapTags(scripts, src => `<script src="${src}"></script>`);
    const moduleTags = wrapTags(modules, src => `<script type="module" src="${src}"></script>`);
    const styleTags = wrapTags(styles, href => `<link rel="stylesheet" href="${href}">`);

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