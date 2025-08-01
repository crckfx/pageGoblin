import fs from 'fs';
import path from 'path';
import { ensureDir } from '../etc/helpers.js';

export function applyChanges(changes) {
    const written = [];

    for (const change of changes) {
        if (change.status === 'MATCHES') continue;

        ensureDir(path.dirname(change.dstPath));
        fs.copyFileSync(change.srcPath, change.dstPath);

        written.push({
            status: 'WRITTEN',
            relative: change.relative,
            srcPath: change.srcPath,
            dstPath: change.dstPath,
        });
    }

    return written;
}

