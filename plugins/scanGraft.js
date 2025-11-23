// plan/scanGraft.js
import fs from "fs";
import crypto from "crypto";

/** Hash entire file or return "" if unreadable */
function fileHash(absPath) {
    try {
        const buf = fs.readFileSync(absPath);
        return crypto.createHash("sha256").update(buf).digest("hex");
    } catch {
        return "";
    }
}

/** Hash string */
function hashString(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}


/**
 * Scan a single routed graft:
 * - build inputHashes
 * - build combinedHash
 * - compare with goblinCache
 * - mark needsRender if different OR if output file missing
 *
 * Returned object:
 * {
 *    combinedHash,
 *    needsRender,
 *    inputHashes
 * }
 */
export function scanGraft(g, goblinCache, outputAbsPath) {

    // If output file does NOT exist → it MUST be rendered
    const outputExists = fs.existsSync(outputAbsPath);

    // Previous state from goblinCache
    const prev = goblinCache.grafts?.[outputAbsPath]?.inputHashes || {};

    // ---------------------------
    // Build new inputHashes
    // ---------------------------
    const inputHashes = {};

    // Template hash
    inputHashes.template = fileHash(g.template);

    // Each input
    for (const [key, inp] of Object.entries(g.inputs)) {
        switch (inp.type) {

            case "text":
                inputHashes[key] = hashString(inp.value || "");
                break;

            case "file":
                inputHashes[key] = fileHash(inp.absPath);
                break;

            case "function":
                // this was a fix for "change function body"->needsRender
                // but it doesn't truly get the "fnout", so we aren't storing a real output from a function here yet
                // 1. hash the serialized function body
                const fnBody = inp.fn ? inp.fn.toString() : "";
                inputHashes[key + "_fnBody"] = hashString(fnBody);

                // 2. hash the function output (depends on plan - DUMB AND NOT AVAILABLE HERE) 
                let fnOut;
                try {
                    fnOut = inp.fn ? inp.fn(plan) : "";
                } catch (err) {
                    fnOut = "__ERROR__:" + err.message;
                }
                inputHashes[key + "_fnOutput"] = hashString(String(fnOut));
                break;

            default:
                inputHashes[key] = hashString(JSON.stringify(inp));
                break;
        }
    }

    // ---------------------------
    // Combined signature
    // ---------------------------
    const combinedHash = hashString(JSON.stringify(inputHashes));

    const oldCombined =
        prev && Object.keys(prev).length
            ? hashString(JSON.stringify(prev))
            : "";

    // ---------------------------
    // Dirty if hashes differ or output missing
    // ---------------------------
    const needsRender = (!outputExists || combinedHash !== oldCombined);

    return {
        combinedHash,
        needsRender,
        inputHashes,
        outputPath: outputAbsPath
    };
}
