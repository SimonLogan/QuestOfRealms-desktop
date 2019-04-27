/**
 * This file implements common functions related to game access.
 * (c) Simon Logan 2019
 */

 // Write a file that contains a list of all the
// <module / filename / type> requirements of this game.
// This is just a human-readable helpful guide - the system
// won't use this file when importing a game, but will instead
// generate the manifest at import time to be sure it is in sync
// what the actual requirements from the database.
function writeGameManifest(tmpdir, manifestData) {
    var fs = require('fs');

    try {
        fs.appendFileSync(tmpdir + '/gameManifest.json', JSON.stringify(manifestData));
        console.log('manifest.json created.');
    } catch (err) {
        /* Handle the error */
        console.error("Failed to create manifest.json: " + err);
    }
}

function writeInstanceManifest(tmpdir, manifestData) {
    var fs = require('fs');

    try {
        fs.appendFileSync(tmpdir + '/saveManifest.json', JSON.stringify(manifestData));
        console.log('saveManifest.json created.');
    } catch (err) {
        /* Handle the error */
        console.error("Failed to create saveManifest.json: " + err);
    }
}

function readGameManifest(manifestDirectory) {
    const fs = require('fs');

    var manifest = fs.readFileSync(path.join(manifestDirectory, 'gameManifest.json'));
    // How to detect an error?

    manifest = JSON.parse(manifest);
    console.log("manifest: " + JSON.stringify(manifest));
    if (!manifest.name) {
        console.error("No name in gameManifest.json.");
        return {};
    }

    return manifest;
}

function readInstanceManifest(manifestDirectory) {
    const fs = require('fs');

    var manifest = fs.readFileSync(path.join(manifestDirectory, 'saveManifest.json'));
    // How to detect an error?

    manifest = JSON.parse(manifest);
    console.log("manifest: " + JSON.stringify(manifest));
    if (!manifest.name) {
        console.error("No name in instanceManifest.json.");
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
