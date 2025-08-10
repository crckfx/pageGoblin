import { sizes } from './global.js';
import { getAvailableWidths } from './getAvailableWidths.js'; // adjust as needed


/**
 * Mutates <img> tags in DOM for responsive behavior, based on matching enriched info.
 *
 * @param {CheerioStatic} $ - Loaded Cheerio HTML instance
 * @param {Array<{ src: string, role: string, sizes: string, maxWidth: number, node: CheerioElement }>} imageNodes
 * @param {string} webRoot - Root directory for file existence checks
 * @returns {Array<{ original: string, updated: string }>} - For optional logging
 */
export function processHtml($, imageNodes, webRoot) {
    const logs = [];

    imageNodes.forEach(({ src, role, sizes: sizesAttr, maxWidth, node }) => {
        const $el = $(node);
        const original = $.html($el);

        const { availableWidths, baseName, ext, pathPrefix } = getAvailableWidths(src, maxWidth, webRoot, sizes);

        if (!availableWidths.length) {
            console.warn(`⚠️ No existing sizes for role "${role}" found on disk`);
            return;
        }

        const fallbackWidth = availableWidths.includes(1024)
            ? 1024
            : availableWidths[availableWidths.length - 1];

        const fallbackSrc = encodeURI(`${pathPrefix}${baseName}-${fallbackWidth}.${ext}`);
        const srcset = availableWidths
            .map(w => `${encodeURI(`${pathPrefix}${baseName}-${w}.${ext}`)} ${w}w`)
            .join(', ');

        $el.attr('src', fallbackSrc);
        $el.attr('srcset', srcset);
        $el.attr('sizes', sizesAttr);
        $el.attr('loading', 'lazy');
        if (!$el.attr('alt')) $el.attr('alt', '');

        const updated = $.html($el);
        logs.push({ original, updated });
    });

    return logs;
}


/**
 * Calls `processHtml` to mutate images and logs before/after versions.
 *
 * @param {CheerioStatic} $ - Cheerio HTML instance
 * @param {Array} imageNodes - Matched image metadata
 * @param {string} webRoot - Filesystem root for validation
 */
export function logHtmlReplacements($, imageNodes, webRoot) {
    const logs = processHtml($, imageNodes, webRoot);
    logs.forEach(({ original, updated }) => {
        console.log('\n=== Original ===');
        console.log(original);
        console.log('=== Replacement ===');
        console.log(updated);
    });
}
