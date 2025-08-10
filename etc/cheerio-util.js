import fs from 'fs';
import * as cheerio from 'cheerio';
/**
 * Loads and parses HTML from a file path using cheerio.
 * @param {string} filePath
 * @returns {CheerioStatic}
 */
export function loadHtml(filePath) {
    const html = fs.readFileSync(filePath, 'utf-8');
    return cheerio.load(html);
}