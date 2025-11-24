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
                // Hash the function body ONLY.
                // (fn output hashing will happen later during write phase, if desired)
                const body = inp.fn ? inp.fn.toString() : "";
                inputHashes[key + "_fnBody"] = hashString(body);
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
