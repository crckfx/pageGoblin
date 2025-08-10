/**
 * Extracts <img> tags that have a valid data-img-role matching a preset.
 * Returns their src, role, preset config, and the original DOM node.
 * Logs warnings for unknown roles.
 * 
 * @param {CheerioStatic} $ - The cheerio instance for the loaded HTML.
 * @param {Record<string, { sizes: string, maxWidth: number }>} presets
 * @returns {Array<{ src: string, role: string, sizes: string, maxWidth: number, node: CheerioElement }>}
 */
export function getTaggedImagesWithPresets($, presets) {
    const results = [];

    $('img').each((_, el) => {
        const $el = $(el);
        const src = $el.attr('src');
        const role = $el.attr('data-img-role');

        if (!src || !role) return;

        const preset = presets[role];
        if (!preset) {
            console.warn(`⚠️  Unknown image role "${role}" for src: ${src}`);
            return;
        }

        results.push({
            src,
            role,
            sizes: preset.sizes,
            maxWidth: preset.maxWidth,
            node: el
        });
    });

    return results;
}
