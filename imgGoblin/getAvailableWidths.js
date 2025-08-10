import path from 'path';
import fs from 'fs';
/**
 * Given an image src and size info, returns available width variants on disk.
 *
 * @param {string} src - Original image source path (e.g., "/images/foo.png")
 * @param {number} maxWidth - Upper limit for allowable image widths
 * @param {string} webRoot - Filesystem base for resolving image paths
 * @param {Object.<string, number>} sizes - Width presets, e.g. { sm: 480, md: 768, ... }
 * @returns {{ availableWidths: number[], baseName: string, ext: string, pathPrefix: string }}
 */
export function getAvailableWidths(src, maxWidth, webRoot, sizes) {
    const pathParts = src.split('/');
    const filename = pathParts.pop();
    const pathPrefix = pathParts.length ? pathParts.join('/') + '/' : '';

    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) {
        console.warn(`⚠️ Filename without extension: ${filename}`);
        return { availableWidths: [], baseName: '', ext: '', pathPrefix };
    }

    const baseName = filename.slice(0, dotIndex);
    const ext = filename.slice(dotIndex + 1);

    const allowedWidths = Object.values(sizes)
        .filter(w => w <= maxWidth)
        .sort((a, b) => a - b);

    const availableWidths = allowedWidths.filter(w => {
        const relativePath = path.join(pathPrefix.replace(/^\/+/, ''), `${baseName}-${w}.${ext}`);
        const localPath = path.resolve(webRoot, relativePath);
        if (!fs.existsSync(localPath)) {
            console.warn(`⚠️ Missing: ${localPath}`);
            return false;
        }
        return true;
    });

    return { availableWidths, baseName, ext, pathPrefix };
}