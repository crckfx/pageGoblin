import fs from "fs";
import path from "path";
import crypto from "crypto";
import { routeGrafts } from "./graft-router.js";

function hashString(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}

function fileHash(absPath) {
    try {
        const buf = fs.readFileSync(absPath);
        return crypto.createHash("sha256").update(buf).digest("hex");
    } catch {
        return "";
    }
}

export async function processGrafts({
    buildContext,
    graftList = {},
    providersList = {},
    goblinCache
}) {
    const root = buildContext.root;
    const routedGrafts = routeGrafts(root, graftList, providersList);
    const graftOutputDir = path.resolve(root, ".pageGoblin/graft");

    for (const name in routedGrafts) {
        const g = routedGrafts[name];
        const outFile = path.join(graftOutputDir, name);

        const prev = goblinCache.grafts[name] || {};
        const prevInput = prev.inputHashes || {};
        const prevFnOut = prev.fnOutputHashes || {};

        const inputHashes = {};
        const locals = {};
        const fnOutputHashes = {};

        // -----------------------------
        // TEMPLATE always hashed
        // -----------------------------
        inputHashes.template = fileHash(g.template);

        // -----------------------------
        // ONE SWITCH – static + dynamic
        // -----------------------------
        for (const [key, inp] of Object.entries(g.inputs)) {
            switch (inp.type) {

                case "text": {
                    const val = inp.value || "";
                    inputHashes[key] = hashString(val);
                    locals[key] = val;
                    break;
                }

                case "file": {
                    const contents = fs.readFileSync(inp.absPath, "utf8");
                    inputHashes[key] = hashString(contents);
                    locals[key] = contents;
                    break;
                }

                case "function": {
                    // static side
                    const body = inp.fn ? inp.fn.toString() : "";
                    inputHashes[key + "_fnBody"] = hashString(body);

                    // dynamic side
                    let out;
                    if (!inp.fn || !inp.exists) {
                        out = "__NO_FN__";
                    } else {
                        try {
                            out = await inp.fn(buildContext);
                        } catch (err) {
                            out = "__ERROR__:" + err.message;
                        }
                    }

                    locals[key] = out;
                    fnOutputHashes[key] = hashString(String(out));
                    break;
                }

                default: {
                    const json = JSON.stringify(inp);
                    inputHashes[key] = hashString(json);
                    locals[key] = null;
                    break;
                }
            }
        }

        // -----------------------------
        // Combined hash + dirty check
        // -----------------------------
        const combinedHash = hashString(JSON.stringify(inputHashes));

        const oldCombined =
            Object.keys(prevInput).length
                ? hashString(JSON.stringify(prevInput))
                : "";

        const outputExists = fs.existsSync(outFile);
        const needsStatic = !outputExists || combinedHash !== oldCombined;

        const fnOutChanged =
            JSON.stringify(prevFnOut) !== JSON.stringify(fnOutputHashes);

        const finalNeedsRender = needsStatic || fnOutChanged;

        // -----------------------------
        // Attach status
        // -----------------------------
        g.status = {
            combinedHash,
            needsRender: needsStatic,
            locals,
            fnOutputHashes,
            fnOutChanged,
            finalNeedsRender,
            outFile,
            outputPath: outFile,
            inputHashes,
        };

        // -----------------------------
        // Update cache
        // -----------------------------
        goblinCache.grafts[name] = {
            inputHashes,
            combinedHash,
            fnOutputHashes,
        };
    }

    // -----------------------------
    // Prune stale cache entries
    // -----------------------------
    for (const key in goblinCache.grafts) {
        if (!routedGrafts[key]) delete goblinCache.grafts[key];
    }

    return routedGrafts;
}
