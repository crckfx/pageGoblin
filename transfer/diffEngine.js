// transfer/diffEngine.js
// Generic diff engine: compares a source file/dir to a destination file/dir.
// Emits { status: 'MISSING' | 'DIFFERS' | 'MATCHES', relative, srcPath, dstPath }

import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * @param {string} source      Absolute path to source file or directory.
 * @param {string} destination Absolute path to destination file or directory.
 * @returns {Array<{status:'MISSING'|'DIFFERS'|'MATCHES', relative:string, srcPath:string, dstPath:string}>}
 */
export function scanDifferences(source, destination) {
    const changes = [];

    if (!fs.existsSync(source)) {
        throw new Error(`Source not found: ${source}`);
    }

    const base = fs.statSync(source).isDirectory() ? source : path.dirname(source);

    if (fs.statSync(source).isDirectory()) {
        scanDir(source, destination, changes, base);
    } else {
        scanFile(source, destination, changes, base);
    }

    return changes;
}

function scanDir(srcDir, dstDir, changes, base) {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.name === "." || entry.name === "..") continue;

        const srcPath = path.join(srcDir, entry.name);
        const dstPath = path.join(dstDir, entry.name);

        if (entry.isDirectory()) {
            scanDir(srcPath, dstPath, changes, base);
        } else {
            scanFile(srcPath, dstPath, changes, base);
        }
    }
}

function scanFile(srcPath, dstPath, changes, base) {
    const relative = path.relative(base, srcPath);

    if (!fs.existsSync(dstPath)) {
        changes.push({ status: "MISSING", relative, srcPath, dstPath });
    } else if (!filesAreEqual(srcPath, dstPath)) {
        changes.push({ status: "DIFFERS", relative, srcPath, dstPath });
    } else {
        changes.push({ status: "MATCHES", relative, srcPath, dstPath });
    }
}

function filesAreEqual(a, b) {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    if (statA.size !== statB.size) return false;

    const hashA = hashFile(a);
    const hashB = hashFile(b);
    return hashA === hashB;
}

function hashFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash("md5").update(buffer).digest("hex");
}
