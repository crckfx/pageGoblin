#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { isCLI } from '../etc/helpers.js';

/**
 * Recursively flattens the nested pages structure into a flat array.
 * Adds inferred outputPath if missing.
 * Tracks depth and navigation path for printing.
 */
export function flattenPages(pages, ancestry = [], depth = 0) {
    const result = [];

    for (const [pageId, config] of Object.entries(pages)) {
        const currentPath = [...ancestry, pageId];
        const inferredOutputPath = path.join('dist', ...currentPath, 'index.html');

        const flattened = {
            ...config,
            outputPath: config.outputPath ?? inferredOutputPath,
            navPath: currentPath,
            navId: currentPath[0],
            depth,
            pageId,
        };

        result.push(flattened);

        if (config.children) {
            const children = flattenPages(config.children, currentPath, depth + 1);
            result.push(...children);
        }
    }

    return result;
}

/**
 * (FOR CLI TEST PURPOSES)
 * Prints flattened pages with indentation and chalk colors.
 * Determines explicit vs inferred outputPath by comparing with inferred path.
 */
function printFlattenedPages(flatPages) {
    for (const page of flatPages) {
        const prefix = chalk.gray('-- '.repeat(page.depth));
        const expectedOutputPath = path.join('dist', ...page.navPath, 'index.html');
        const wasExplicit = page.outputPath !== expectedOutputPath;

        const label = wasExplicit
            ? chalk.bold.green('explicit')
            : chalk.yellow('inferred');

        const pageInfo = chalk.underline.blue(`${page.pageId} (depth ${page.depth})`);

        console.log(`${prefix}${page.outputPath}  (${label}) ${pageInfo}`);
    }

    console.log(chalk.bold(`\nTotal pages: ${flatPages.length}`));
}

// ────── CLI ENTRY POINT ──────

if (isCLI(import.meta.url)) {
    const args = process.argv.slice(2);
    const [projectRootArg, distRootArg, pagesJsonArg] = args;

    if (!projectRootArg || !distRootArg || !pagesJsonArg) {
        console.error(
            chalk.red('Usage: node nest-tester.js <projectRoot> <distRoot> <pagesJson>')
        );
        process.exit(1);
    }

    try {
        const raw = fs.readFileSync(pagesJsonArg, 'utf-8');
        const nestedPages = JSON.parse(raw);

        const flatPages = flattenPages(nestedPages);
        printFlattenedPages(flatPages);
    } catch (err) {
        console.error(chalk.red('Error reading or parsing JSON:'), err);
        process.exit(1);
    }
}
