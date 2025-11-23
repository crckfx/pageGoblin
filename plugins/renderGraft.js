// plugins/renderGraft.js
import fs from "fs";
import path from "path";
import ejs from "ejs";
import { ensureDir } from "../etc/helpers.js";

export async function renderGraft(g, outPath, plan) {
    const { template, inputs } = g;

    // Build locals for template
    const locals = {};
    for (const [key, input] of Object.entries(inputs || {})) {
        switch (input.type) {
            case "text":
                locals[key] = input.value;
                break;
            case "file":
                locals[key] = fs.readFileSync(input.absPath, "utf8");
                break;
            case "function":
                locals[key] = input.exists ? await input.fn(plan) : null;
                break;
            default:
                locals[key] = null;
        }
    }

    ensureDir(path.dirname(outPath));

    // direct EJS render
    const output = await ejs.renderFile(template, locals, { async: true });

    // write to graft file
    fs.writeFileSync(outPath, output, "utf8");
}
