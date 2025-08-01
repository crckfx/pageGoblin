import fs from 'fs';
import { readFile } from 'fs/promises';
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from 'url';


// helper to 
export function isCLI(callerMetaUrl) {
    if (!process.argv[1]) return false; // safeguard if no argv[1]

    const invokedPath = fs.realpathSync(process.argv[1]);
    const callerPath = fs.realpathSync(fileURLToPath(callerMetaUrl));

    return invokedPath === callerPath;
}


// helper function to create a directory if it doesn't exist
export function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// ------------------ HELPERS ------------------

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