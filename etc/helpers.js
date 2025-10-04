import fs from 'fs';
import { readFile } from 'fs/promises';
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from 'url';


// helper to determine if a module was invoked via CLI
export function isCLI(callerMetaUrl) {
    if (!process.argv[1]) return false; // safeguard if no argv[1]
    const invokedPath = fs.realpathSync(process.argv[1]);
    const callerPath = fs.realpathSync(fileURLToPath(callerMetaUrl));
    return invokedPath === callerPath;
}


// helper to autocreate a directory if it doesn't exist
export function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// function to find all files in a directory
export function walkAllFiles(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(walkAllFiles(full));
        } else {
            files.push(path.resolve(full));
        }
    }
    return files;
}

// function to print a file if changed
export function logChange(change, options = {}) {
    const { verbose = false } = options;
    const rel = change.relative;

    const tag = {
        MATCHES: chalk.gray("[MATCHES]"),
        MISSING: chalk.yellow("[MISSING]"),
        DIFFERS: chalk.green("[DIFFERS]"),
        WRITTEN: chalk.cyan("[WRITTEN]"),
        SKIP: chalk.dim("[SKIP]"),
        DELETE: chalk.hex("#FF8800")("[DELETE]"),
    }[change.status] || `[${change.status}]`;

    // Skip quiet statuses unless verbose
    if ((change.status === "MATCHES" || change.status === "SKIP") && !verbose) return;

    console.log(`${tag} ${rel}`);
}


/**
 * Reads a UTF-8 file and parses its contents as JSON.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<any>} The parsed JSON object.
 */
export async function loadJSON(filePath) {
    const text = await readFile(filePath, 'utf8');
    return JSON.parse(text);
}


export function ensureArray(x) {
    if (x == null) return [];
    return Array.isArray(x) ? x : [x];
}


// helper function to read file as utf8
export async function readTextFile(filePath) {
    return readFile(filePath, "utf8");
}

// helper: load and join multiple text files
export async function readAndJoinTextFiles(paths) {
    if (!paths) return "";
    const arr = Array.isArray(paths) ? paths : [paths];
    const contents = await Promise.all(arr.map(p => readTextFile(p)));
    return contents.join("\n");
}

export function wrapTags(items, template) {
    if (!items) return "";
    const arr = Array.isArray(items) ? items : [items];
    return arr.map(template).join("\n");
}

export async function resolveFragments(fragments) {
    const out = {};
    for (const [key, filePath] of Object.entries(fragments || {})) {
        if (!filePath) continue;
        out[key] = await readTextFile(filePath);
    }
    return out;
}
