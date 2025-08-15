// read/inflateArticlesToPages.js
import path from "path";

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

            // Page contract (relative to project root; renderEntry resolves them):
            contentPath: path.join("articles", `${articleId}.html`),
            outputPath: `/articles/${articleId}/index.html`,

            // Article defaults (still normal Page fields; page-level overrides still win)
            templatePath: articleCfg.templatePath ?? config.templatePath,
            styles: Array.isArray(articleCfg.styles) ? articleCfg.styles : [],
            // scripts/modules/navPath/etc can be added later if you want parity
        });
    }

    return out;
}
