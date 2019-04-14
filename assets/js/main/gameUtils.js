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


// Try to retrieve the named property from the supplied object.
// If not found, take it from the named defaults collection instead.
// This is because some properties aren't stored in the db if they
// have default values.
function readProperty(objectProperty, defaultProperty) {
    return objectProperty ? objectProperty: defaultProperty;
}
