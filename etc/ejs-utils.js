import path from "path";
import ejs from "ejs";

/**
 * Render an EJS template with the provided context.
 *
 * @param {string} templatePath - Absolute path to the EJS template file.
 * @param {object} context - Object of variables to pass into the template.
 * @returns {Promise<string>} - Rendered HTML output.
 */
export async function renderTemplate(templatePath, context = {}) {
    return await ejs.renderFile(path.resolve(templatePath), context, { async: true });
}
