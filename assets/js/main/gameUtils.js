/**
 * This file implements common functions related to game access.
 * (c) Simon Logan 2019
 */

function readManifest(dir) {
    const fs = require('fs');

    var manifest = fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8');
    // How to detect an error?

    manifest = JSON.parse(manifest);
    console.log("manifest: " + JSON.stringify(manifest));
    if (!manifest.name) {
        console.error("No name in manifest.json.");
        return {};
    }

    return manifest;
}