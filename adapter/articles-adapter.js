import path from "path";
import { ensureArray } from "../etc/helpers.js";

/**
 * turn articles.json {id: {title, image, blurb}} into Page-like entries.
 * all paths are project-relative (same as pages.json).
 */
export function inflateArticlesToPages(articlesObj, config) {
    const out = [];
    const articleCfg = config.article ?? {};

    for (const [articleId, meta] of Object.entries(articlesObj)) {
        out.push({
            pageId: `article:${articleId}`,
            title: meta.title,
            articleId,
            image: meta.image,
            blurb: meta.blurb ?? "",

            scripts: ensureArray(articleCfg.scripts),
            modules: ensureArray(articleCfg.modules),
            styles: ensureArray(articleCfg.styles),
            contentPath: ensureArray(path.join("articles", `${articleId}.html`)),
            imports: ensureArray(articleCfg.imports),

            // Location-first outputs
            outDir: `/articles/${articleId}`,
            ...(articleCfg.outFile ? { outFile: articleCfg.outFile } : {}),

            // make it specifically like a page that is an article
            templatePath: articleCfg.templatePath ?? config.templatePath,
            styles: Array.isArray(articleCfg.styles) ? articleCfg.styles : [],
        });
    }

    return out;
}
