// plugins/computeGraftData.js
import fs from "fs";

/**
 * Compute dynamic graft data:
 *  - locals for EJS
 *  - hashes of function outputs
 *
 * NOTE: This does NOT touch the filesystem except reading input files.
 * NOTE: This does NOT decide needsRender.
 */
import crypto from "crypto";

function hashString(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}

export async function computeGraftData(g, plan) {
    const { inputs } = g;

    const locals = {};
    const fnOutputHashes = {};   // dynamic hashes used for needsRender

    for (const [key, input] of Object.entries(inputs || {})) {

        switch (input.type) {
            case "text":
                locals[key] = input.value;
                break;

            case "file":
                locals[key] = fs.readFileSync(input.absPath, "utf8");
                break;

            case "function": {
                if (!input.exists || !input.fn) {
                    locals[key] = null;
                    fnOutputHashes[key] = hashString("__no_fn__");
                    break;
                }

                // Execute user-provided function
                let out;
                try {
                    out = await input.fn(plan);
                } catch (err) {
                    out = "__ERROR__:" + err.message;
                }

                locals[key] = out;
                fnOutputHashes[key] = hashString(String(out));
                break;
            }

            default:
                locals[key] = null;
                break;
        }
    }

    return { locals, fnOutputHashes };
}
