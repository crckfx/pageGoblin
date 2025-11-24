// plugins/writeGraft.js
import fs from "fs";
import path from "path";
import ejs from "ejs";
import { ensureDir } from "../etc/helpers.js";

/**
 * Write graft output to disk using final locals.
 * DOES NOT compute needsRender or evaluate functions.
 */
export async function writeGraft(g) {
    const { template, outputPath, locals } = g;


    ensureDir(path.dirname(outputPath));
    if (!template) {
        console.log(`couldn't find template for ${g}`);
        return;
    }

    // Render with locals prepared earlier
    const output = await ejs.renderFile(template, locals, { async: true });

    fs.writeFileSync(outputPath, output, "utf8");
    return true;
}
