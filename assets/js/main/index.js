/**
 * Created by Simon on 13 May 2018.
 * This file implements the interactions for the QuestOfRealms designer main page.
 * (c) Simon Logan
 */

"use strict";

window.$ = window.jQuery = require('jquery');
const async = require('async');
const electron = require('electron');
const ipc = electron.ipcRenderer;
var Datastore = require('nedb');
const dbWrapper = require('../../assets/js/utils/dbWrapper');
var availableGameDesigns = {};
var availableGames = [];

// When the page has finished rendering...
$(document).ready(function () {
    // Load the data and call the functions below when it has been
    // retrieved. You need to use this callback approach because the AJAX calls are
    // asynchronous. This means the code here won't wait for them to complete,
    // so you have to provide a function that can be called when the data is ready.
    // TODO: Only do this the first time design mode is selected.
    async.waterfall([
        function (callback) {
            dbWrapper.openDesignerDB(callback);
        },
        function (callback) {
            loadAndDisplayAvailableGameDesigns(callback);
        },
        function (callback) {
            loadAndDisplayAvailableGames(callback);
        },
    ],
        function (err, results) {
            if (!err) enableControls();
        });

    $('#designMode').on('click', function () {
        $(this).prop('disabled', true);
        $('#designContainer').show();
        $('#gameMode').prop('disabled', false);
        $('#playContainer').hide();
    });

    $('#gameMode').on('click', function () {
        $(this).prop('disabled', true);
        $('#playContainer').show();
        $('#designMode').prop('disabled', false);
        $('#designContainer').hide();
    });

    // Allow creation of new games by handling clicks on the "New Game" button.
    // The jQuery selector $('#showCreateGameButton') selects the button by its "id" attribute.
    $('#showCreateGameButton').click(function () {
        console.log("showCreateGameButton.press");
        // $(this) is the button you just clicked.
        $(this).hide();
        $('#createGameDesignPanel').show();
        $('#createGameButton').prop('disabled', false);
    });

    // Handle clicking the "Create!" button on the "New game" form.
    $('#createGameButton').click(function () {
        createGame()
    });

    // Only enable the export game button if a name has been specified.
    $('#exportGameName').on('keyup', function () {
        if ($(this).val().trim()) {
            $('#exportGameButton').prop('disabled', false);
        } else {
            $('#exportGameButton').prop('disabled', true);
        }
    });

    // Handle clicking the "Export" button on the "Export game" form.
    $('#exportGameButton').click(function () {
        const { dialog } = require('electron').remote;
        dialog.showOpenDialog({
            properties: ['openDirectory']
        }, function (chosenPath) {
            if (chosenPath !== undefined) {
                exportGame(chosenPath[0], function (err) {
                    if (err) {
                        alert(err);
                        return;
                    }
                });
            }
        });
    });

    $('#importGameButton').click(function () {
        $('#importPanel #playerName').val('');
        $('#importPanel').show();
    });
 
    // Entering a value into the "player name" field on the "import game" form.
    // Only enable the "choose file" button if a name has been specified.
    $('#playerName').on('keyup paste', function () {
        $('#chooseGameButton').prop('disabled', ($(this).val().trim() === ""));
    });

    // Handle clicking the "Choose file" button on the import game form.
    $('#chooseGameButton').click(function () {
        const { dialog } = require('electron').remote;
        dialog.showOpenDialog({
            properties: ['openFile']
        }, function (chosenPath) {
            if (chosenPath !== undefined) {
                importGame(chosenPath[0], function (err, gameName) {
                    if (err) {
                        alert(err);
                        resetImportGameForm();
                        return;
                    }

                    // Configure the player and some other defaults when importing a game.
                    // You can't send messages between renderers. You have to use main.js as a message hub.
                    initializePlayer($('#playerName').val().trim(), gameName);
                    resetImportGameForm();

                    // Refresh the games table.
                    loadAndDisplayAvailableGames(function () { });
                });
            }
        });
    });
});


//
// Utility functions
//

function initializePlayer(playerName, gameName) {
    const app = electron.remote.app;
    var gameBasedir = path.join(app.getPath('userData'), "games");
    // The dbs will be in a 0/ subdirectory. This is the initial
    // game version. Subsequent saves will go into 1/ etc.
    var dbPath = path.join(gameBasedir, gameName, "0");
    var gameDbWrapper = require('../../assets/js/utils/dbWrapper');

    async.waterfall([
        function (callback) {
            gameDbWrapper.openGameDB(callback, dbPath);
        },
        function (callback) {
            var db_collections = dbWrapper.getDBs();
            loadGame(db_collections, function (error, gameData) {
                if (error) {
                    callback(error);
                } else {
                    callback(error, db_collections, gameData);
                }
            });
        },
        function (db_collections, gameData, callback) {
            // Initially assume the first realm. Later, we need to
            // load the current realm from the player data.
            loadRealm(db_collections, gameData.realms[0], function (error, realmData) {
                if (error) {
                    callback(error);
                } else {
                    callback(error, db_collections, gameData, realmData);
                }
            });
        },
        function (db_collections, gameData, realmData, callback) {
            var startAtObjective = realmData.objectives.filter(objective => objective.type === "Start at");
            if (startAtObjective.length !== 1) {
                // Should be impossible.
                alert(`Found ${startAtObjective.length} \"Start at\" objectives. Expecting 1`);

                callback("Wrong number of objectives.");
                return;
            }

            // If we found a start at objective, assume it has valid x and y params.
            // This should really be validated too.
            var startx = startAtObjective[0].params.filter(param => param.name === "x");
            var starty = startAtObjective[0].params.filter(param => param.name === "y");

            // Set the default map draw mode too.
            gameData.player = {
                'name': playerName,
                'location': {
                    'realm': realmData._id,
                    'x': startx[0].value,
                    'y': starty[0].value
                },
                'visited': {},
                'inventory': [],
                'using': [],
                'damage': 5,
                'health': 25,
                'mapDrawMode': mapDrawModeEnum.AUTO_ALL
            };

            // The player has implicitly visited the start location.
            var visitedKey = startx[0].value + "_" + starty[0].value;
            var visitedRecord = {};
            visitedRecord[visitedKey] = true;
            gameData.player.visited[realmData._id] = visitedRecord;

            db_collections.game.update({ _id: gameData._id }, gameData, {}, function (err, numReplaced) {
                callback(null);
            });
        }
    ],
        function (err, results) {
            // Create the tabbed panels
            //$("#paletteInnerPanel").tabs();
            //$("#propertiesInnerPanel").tabs();
            //if (!err) enableControls();
        });
}

function loadGame(db_collections, callback) {
    console.log(Date.now() + ' loadGame');

    db_collections.game.find({}, function (err, data) {
        ipc.send('logmsg', "loadGame found data: " + JSON.stringify(data));

        // There should be only one.
        if (data.length > 1) {
            var msg = "Invalid game.db - expecting only one entry";
            alert(msg);
            callback(msg);
            return;
        }

        callback(null, data[0]);
    });
}

function loadRealm(db_collections, realmId, callback) {
    ipc.send('logmsg', 'load realm ' + realmId);

    db_collections.questrealms.find({ _id: realmId }, function (err, data) {
        ipc.send('logmsg', "loadRealm found data: " + JSON.stringify(data));
        callback(null, data[0]);
    });
}

function resetImportGameForm() {
    $('#chooseGameButton').prop('disabled', true);
    $('#playerName').val();
    $('#importPanel').hide();
}

function enableControls() {
    console.log("enableControls");
    var controls = ['#designMode', '#gameMode', '#showCreateGameButton', '#createGameButton', '#exportGameButton'];
    for (var i = 0; i < controls.length; i++) {
        $(controls[i]).prop('disabled', false);
        $(controls[i]).attr('title', '');
    }
}


function displayAvailableGameDesigns() {
    var header = "<table class='realmList'>";
    header += "<tr><th class='realmListName'>Name</th>";
    header += "<th class='realmListDescription'>Description</th>";
    header += "<th>Create Date</th>";
    header += "<th>Edit</th>";
    header += "<th>Delete</th>";
    header += "<th>Export</th>";

    var row = 0;
    var body = "";
    for (var key in availableGameDesigns) {
        if (!availableGameDesigns.hasOwnProperty(key)) {
            continue;
        }

        var thisGame = availableGameDesigns[key];
        var rowClass = "realmListOddRow";
        if (0 == (++row % 2)) rowClass = "realmListEvenRow";
        body += "<tr id='" + thisGame._id + "' class='" + rowClass + "'>";
        body += "<td class='gameName'>" + thisGame.name + "</td>";
        body += "<td>" + thisGame.description + "</td>";

        var updateTime = thisGame.updatedAt.toLocaleDateString(
            "en-GB",
            {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric'
            });
        body += "<td>" + updateTime + "</td>";

        body += "<td><input type='button' class='editGameDesign' value='Edit'/></td>";
        body += "<td><input type='button' class='deleteGameDesign' value='Delete'/></td>";
        body += "<td><input type='button' class='exportGameDesign' value='Export'/></td>";
        body += "</tr>";
    };

    $('#gameDesignList').html("");
    $('.editGameDesign').off();
    $('.deleteGameDesign').off();
    $('.exportGameDesign').off();

    if (body.length > 0) {
        $('#gameDesignList').html(header + body);

        $('.editGameDesign').on('click', function () {
            editGameDesign($(this));
        });

        $('.deleteGameDesign').on('click', function () {
            deleteGameDesign($(this));
        });

        $('.exportGameDesign').on('click', function () {
            // Record which game you are exporting.
            $('#exportGameId').val($(this).closest('tr').attr('id'));
            $('#exportGamePanel').show();
            $('#exportGameButton').prop('disabled', true);
        });
    }
}


// Show all the saved versions of the specified game.
// thisGame will be an entry like this:
// { 'dir': "superGame",
//   'manifest': manifest,
//   'saves': [{ 'saveName': '0' }]]
// }
function displayGameRecords(gameId) {
    var thisGame = availableGames[gameId];
    console.log("displayGameRecords() thisGame: " + JSON.stringify(thisGame));
    var gameHTML = "<div class='gameDetails' data-gameId='" + gameId + "'>" +
        "<div id='gameNameContainer'><strong>Name:</strong> " + thisGame.manifest.name + "</div>" +
        "<div><input type='button' class='deleteGame' value='Delete Game' " +
        "title='Delete all saved versions of this game.'/></div>" +
        "<div id='gameDescriptionContainer'>" + thisGame.manifest.description + "</div>";

    var row = 0;
    var rowClass = "realmListOddRow";
    var instanceTable = "<div id='instanceTable'>";
    instanceTable += "<table class='realmList'>";
    instanceTable += "<th class='realmListDescription'>Description</th>";
    instanceTable += "<th class='realmListSavedate'>Save date</th>";
    instanceTable += "<th>Play</th>";
    instanceTable += "<th>Delete</th>";

    for (var saveNum = 0; saveNum < thisGame.saves.length; saveNum++) {
        if (0 == (++row % 2)) rowClass = "realmListEvenRow";
        instanceTable += "<tr data-instance='" + thisGame.saves[saveNum].saveId + "' class='" + rowClass + "'>";
        instanceTable += "<td>" + thisGame.saves[saveNum].saveName + "</td>";

        if (thisGame.saves[saveNum].saveDate) {
            instanceTable += "<td>" + thisGame.saves[saveNum].saveDate + "</td>";
        } else {
            instanceTable += "<td/>";
        }

        instanceTable += "<td><input type='button' class='playGameInstance' value='Play'/></td>";

        // You can't delete the original version of the game.
        if (saveNum === 0) {
            instanceTable += "<td>&nbsp;</td>";
        } else {
            instanceTable += "<td><input type='button' class='deleteGameInstance' value='Delete' title='Delete just this saved version.'/></td>";
        }

        instanceTable += "</tr>";
    }
    instanceTable += "</table></div>";
    gameHTML += instanceTable;
    $('#gameList').append(gameHTML);
}


function displayAvailableGames() {
    console.log(JSON.stringify(availableGames));

    $('#gameList').html("");
    $('.deleteGame').off();
    $('.playGame').off();

    if (availableGames.length === 0) {
        return;
    }

    for (var i = 0; i < availableGames.length; i++) {
        displayGameRecords(i);
    }

    $('.deleteGame').on('click', function () {
        deleteGame($(this));
    });

    $('.playGameInstance').on('click', function () {
        console.log("playgame");
        var gameName = availableGames[$(this).closest('.gameDetails').attr('data-gameId')].manifest.name;
        var gameInstance = $(this).closest('tr').attr('data-instance');
        var maxGameInstance = $(this).closest('tbody').find('tr:last').attr('data-instance');

        // Build a URL to invoke the game player.
        var args = {
            url: 'file://' + __dirname + '/../playGame/playGame.html',
            data: { 'name': gameName,
                    'instance': gameInstance,
                    'maxInstance': maxGameInstance }
        };
        ipc.send('play-game', args);
    });

    $('.deleteGameInstance').on('click', function () {
        deleteGameInstance($(this));
    });
}


// Game designs (in design mode).
function loadAndDisplayAvailableGameDesigns(callback) {
    var db_collections = dbWrapper.getDBs();
    db_collections.games.find({}, function (err, data) {
        console.log("loadAndDisplayAvailableGameDesigns found data: " + JSON.stringify(data));

        for (var i = 0; i < data.length; i++) {
            availableGameDesigns[data[i]._id] = data[i];
        }

        displayAvailableGameDesigns();

        if (callback) {
            callback();
        }
    });
}


// Playable games (in game mode).
function loadAndDisplayAvailableGames(callback) {
    const app = electron.remote.app;
    var gameBasedir = app.getPath('userData') + "/games/";

    var fs = require('fs');
    console.log("gameBasedir: " + gameBasedir);

    // Ensure the game parent directory exists.
    if (!fs.existsSync(gameBasedir)) {
        fs.mkdirSync(gameBasedir);
    }

    // from https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
    const { lstatSync, readdirSync } = require('fs');
    const path = require('path');
    const getDirectories = function(basedir) {
        var candidates = readdirSync(basedir);
        var matches = [];
        $.each(candidates, function (index, candidate) {
            if (lstatSync(path.resolve(basedir, candidate)).isDirectory()) {
                matches.push(candidate);
            }
        });

        console.log("isDirectory() matches=" + JSON.stringify(matches));
        return matches;
    };

    var games = getDirectories(gameBasedir);
    availableGames = [];
    $.each(games, function (index, gameName) {
        var gamePath = path.join(gameBasedir, gameName);
        console.log("Checking game at path:" + gamePath);

        var manifest = readGameManifest(gamePath);
        if (0 === Object.keys(manifest).length) {
            console.error("Ignoring path " + gamePath + " - Failed to read gameManifest.json.");
            return;
        }

        // Now check saved versions.
        var availableSaves = [];
        var saveIds = getDirectories(gamePath);
        $.each(saveIds, function (index, saveId) {
            if (saveId == "modules") {
                return;
            }

            console.log("Checking save Id:" + saveId);

            var manifest = readInstanceManifest(path.join(gamePath, saveId));
            if (0 === Object.keys(manifest).length) {
                console.error("Ignoring path " + gamePath + " - Failed to read saveManifest.json.");
                return;
            }

            availableSaves.push({ 'saveId': saveId,
                                  'saveName': (manifest.name ? manifest.name : ""),
                                  'saveDate': manifest.saveDate });
        });

        availableGames.push({ 'manifest': manifest, 'saves': availableSaves });
    });

    // This needs to wait until the manifests have been read.
    // Ideally change readXxxManifest() to be synchronous. 
    displayAvailableGames();
    callback();
}


function createGame() {
    var gameName = $('#gameName').val().trim();
    var gameDesc = $('#gameDescription').val().trim();

    // Disallow duplicate game names.
    // $.each() is a jQuery function to iterate over a collection, calling the supplied
    // function for each entry, passing in the array index and the array value.
    // We supply the collection using a jQuery selector that looks for a <td> with class
    // "gameName" on each row of any table inside the gameDesignList div.
    var nameExists = false;
    $.each($('#gameDesignList tr td.gameName'), function (index, value) {
        if ($(value).text() == gameName) {
            nameExists = true;
            return false; // Stop looping
        }
    });

    if (nameExists) {
        alert("That name is already in use");
        return;
    }

    cleanAndHideCreateGameDesignPanel();

    // Create an empty game.
    var game = {
        name: gameName,
        description: gameDesc,
        realms: [],
        updatedAt: new Date(Date.now())
    };

    var db_collections = dbWrapper.getDBs();
    db_collections.games.insert(game, function (err, newGame) {
        if (err) {
            alert("Error: " + JSON.stringify(err));
            return;
        }

        console.log("created game: " + JSON.stringify(newGame));

        // Build a URL to invoke the game editor.
        var args = {
            url: 'file://' + __dirname + '/../gameEditor/editGame.html',
            data: { id: newGame._id }
        };
        ipc.send('edit-game', args);
    });
}


// The "Edit" button was clicked on one of the Game designs table rows.
function editGameDesign(target) {
    // Build a URL to invoke the game editor, passing the id of the row that
    // was clicked. The jQuery selector target.closest('tr') traverses the
    // parents of the element that was clicked until it finds one of type "<tr>",
    // then we take its id value.
    var gameId = target.closest('tr').attr('id');

    // Send an ipc command to the main window to tell it to load new html.
    var args = {
        url: 'file://' + __dirname + '/../gameEditor/editGame.html',
        data: { id: gameId }
    };
    ipc.send('edit-game', args);
}


// Clear any data that was typed into the "Create Game" form so that it is
// blank the next time it is displayed.
function cleanAndHideCreateGameDesignPanel() {
    // Select the panel using its 'id' attribute.
    var panel = $('#createGameDesignPanel');
    panel.hide();
    // Find all the text fields on the panel and clear their contents.
    panel.find('input[type=text]').val('');
}


// The "Delete" button was pressed on a row in the "Game Designs" table.
function deleteGameDesign(target) {
    // Find the name and id of the game design in question by navigating to
    // the relevent form elements. See the explanations of jQuery selectors
    // above for more details.
    var name = $(target.closest('tr').find('td')[0]).text();
    var id = target.closest('tr').attr('id');

    if (confirm("Are you sure you want to delete game design " + name + "?")) {
        var db_collections = dbWrapper.getDBs();
        db_collections.games.remove({ _id: id }, function (err, numRemoved) {
            if (err) {
                console.error("Failed to delete game design. Error: " + err);
                return;
            }

            if (!numRemoved) {
                console.error("Failed to delete game design.");
                return;
            }

            // Remove the deleted realm from the local collection rather
            // than reloading all from the db.
            for (var key in availableGameDesigns) {
                if (!availableGameDesigns.hasOwnProperty(key)) {
                    // Should never happen.
                    continue;
                }

                if (key === id) {
                    delete availableGameDesigns[key];
                    break;
                }
            }

            displayAvailableGameDesigns();
        });
    }
}


// The "Delete" button was pressed in the title of the "Games" table.
// This will delete the game and all saves.
function deleteGame(target) {
    // Find the name and id of the game in question by navigating to the
    // relevent form elements. See the explanations of jQuery selectors
    // above for more details.
    var gameId = target.closest('.gameDetails').attr('data-gameId');
    var name = availableGames[gameId].manifest.name;
    if (confirm("Are you sure you want to delete game " + name + "?" +
                "\nThis will delete all saved data for this game.")) {
        const app = electron.remote.app;
        var gameDir = path.join(app.getPath('userData'), "games", name);
        removeGameDirectory(gameDir, function (err) {
            if (!err) {
                availableGames.splice(gameId, 1);
                displayAvailableGames();
            }
        });
    }
}


// The "Delete" button was pressed on a row in the "Games" table.
// This will delete just that save.
function deleteGameInstance(target) {
    // Find the name and id of the game in question by navigating to the
    // relevent form elements. See the explanations of jQuery selectors
    // above for more details.
    var saveName = $(target.closest('tr').find('td')[0]).text();
    if (confirm("Are you sure you want to save " + saveName + "?")) {
        var gameId = target.closest('.gameDetails').attr('data-gameId');
        var gameName = availableGames[gameId].manifest.name;
        var saveId = target.closest('tr').attr('data-instance');
        const app = electron.remote.app;
        var saveDir = path.join(app.getPath('userData'), "games", gameName, saveId);
        removeGameDirectory(saveDir, function (err) {
            if (!err) {
                for (var i = 0; i < availableGames[gameId].saves.length; i++) {
                    if (availableGames[gameId].saves[i].saveId === saveId) {
                        availableGames[gameId].saves.splice(i, 1);
                        break;
                    }
                }

                displayAvailableGames();
            }
        });
    }
}


// Clear any data that was typed into the "Export Game" form so that it is
// blank the next time it is displayed.
function cleanAndHideExportGamePanel() {
    // Select the panel using its 'id' attribute.
    var panel = $('#exportGamePanel');
    panel.hide();
    // Find all the text fields on the panel and clear their contents.
    panel.find('input[type=text]').val('');
}


// Remove the game from the filesystem.
function removeGameDirectory(gameDir, callback) {
    console.log("removeGameDirectory game dir: " + gameDir);

    removeDirectory(gameDir, function (err) {
        if (err) {
            var errMsg = "Failed to remove game directory " + gameDir;
            console.error(errMsg);
            callback(errMsg);
            return;
        }

        callback();
    });
}

// Recursively remove the specified directory
function removeDirectory(pathName, callback) {
    var rimraf = require('rimraf');
    rimraf(pathName, function (err) {
        if (err) {
            var errMsg = "Failed to remove directory " + pathName;
            console.error(errMsg);
            callback(errMsg);
            return;
        }

        callback();
    });
}


// Export the modules required by this game.
function exportModules(tmpDir, moduleRequirements, exportCallback) {
    console.log("export modules");
    var fs = require('fs');
    var targetPathRoot = path.join(tmpDir, "/modules");

    fs.mkdir(targetPathRoot, { recursive: false }, (err) => {
        if (err) {
            exportCallback(err);
            return;
        }

        var sourcePathRoot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
        var ncp = require('ncp').ncp;
        ncp.limit = 16;

        async.forEachOf(
            moduleRequirements.modules,
            function (moduleDetails, moduleName, callback) {
                if (!moduleRequirements.modules.hasOwnProperty(moduleName)) {
                    callback();
                    return;
                }

                // Export the whole module.
                var targetPath = path.join(targetPathRoot, moduleName);
                var sourcePath = path.join(sourcePathRoot, moduleName);
                console.log("trying to export module " + sourcePath + " to " + targetPath);

                fs.mkdir(targetPath, { recursive: false }, (err) => {
                    if (err) throw err;

                    // Use ncp for recursive file copy.
                    // https://www.npmjs.com/package/ncp
                    ncp(sourcePath, targetPath, function (err) {
                        if (err) {
                            console.error(err);
                            callback(err);
                            return;
                        }

                        // Completed this module successfully.
                        callback();
                    });
                });
            },
            function (err) {
                exportCallback(err);
            }
        );
    });
}


// Add the collectionItem <module / filename / type> hierarchy to the
// modules collection if it does not already exist.
function updateCollectionModules(collectionItem, modules) {
    if (0 === collectionItem.length) {
        return;
    }

    if (!(collectionItem.module in modules.modules)) {
        modules.modules[collectionItem.module] = {};
    }

    if (!(collectionItem.filename in modules.modules[collectionItem.module])) {
        modules.modules[collectionItem.module][collectionItem.filename] = [];
    }

    if (modules.modules[collectionItem.module][collectionItem.filename].indexOf(collectionItem.type) === -1) {
        modules.modules[collectionItem.module][collectionItem.filename].push(collectionItem.type);
    }
}


// Extract a unique set of all the modules required by this realm.
function findRealmModules(newRealm, moduleRequirements) {
    if (!moduleRequirements.hasOwnProperty('modules')) {
        moduleRequirements['modules'] = {};
    }

    // Cover the environments for the map locations
    newRealm.mapLocations.forEach(function (mapLocation) {
        updateCollectionModules(mapLocation, moduleRequirements);

        // Cover the items and characters from each map location.
        mapLocation.items.forEach(function (item) {
            updateCollectionModules(item, moduleRequirements);
        });

        mapLocation.characters.forEach(function (character) {
            updateCollectionModules(character, moduleRequirements);
        });
    });

    console.log("leaving updateRealmModules: " + JSON.stringify(moduleRequirements));
}


// Export the specified directory to a zipfile names gameName.zip
// Uses archiver: https://www.npmjs.com/package/archiver
function createZipFile(tmpDir, gameName, callback) {
    // This code is based on the example from the archiver documentation.
    var fs = require('fs');
    var archiver = require('archiver');

    // Create a file to stream archive data to.
    var output = fs.createWriteStream(tmpDir + '/../' + gameName + '.zip');
    var archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        callback();
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function () {
        console.log('Data has been drained');
    });

    // Good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
            // log warning
        } else {
            // throw error
            throw err;
        }
    });

    // Good practice to catch this error explicitly
    archive.on('error', function (err) {
        throw err;
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Append files from a sub-directory, putting its contents at the root of archive
    archive.directory(tmpDir, false);

    // Finalize the archive (i.e. we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register them beforehand
    archive.finalize();
}


function exportGame(gameBasedir, callback) {
    // Create a temporary working directory.
    var fs = require('fs');

    // Export the game and the realms from the master db.
    var exportFileName = $('#exportGameName').val();
    var gameDir = path.join(gameBasedir, exportFileName);
    var dbDir = path.join(gameDir, "0");
    var gameId = $('#exportGameId').val().trim();

    var db_collections = dbWrapper.getDBs();
    db_collections.games.find({ '_id': gameId }, function (err, gameData) {
        if (err) {
            console.error("Failed to find db");
            return;
        }

        // There are several steps in the game export process, which must happen
        // in sequence, despite some being asynchronous.
        async.waterfall([
            function (callback) {
                var fullExportFileName = path.join(gameBasedir, exportFileName + ".zip");
                fs.access(fullExportFileName, fs.constants.F_OK, function (err) {
                    console.log(`${fullExportFileName} ${err ? 'does not exist' : 'exists'}`);
                    if (err) {
                        if (err.code === "ENOENT") {
                            // Good, we want it to not exist.
                            callback(null);
                        } else {
                            callback(err);
                        }
                    } else {
                        callback(`Game ${fullExportFileName} already exists.`);
                    }
                });
            },
            // Should be able to do the mkdir in one step with the { recursive: true }
            // option to fs.mkdir() but that isn't working in the current version
            // of node.
            function (callback) {
                fs.mkdir(gameBasedir, function (err) {
                    if (err && err.code !== "EEXIST") {
                        console.log("Info: " + JSON.stringify(err));
                    }

                    callback(null);
                });
            },
            function (callback) {
                fs.mkdir(gameDir, function (err) {
                    if (err) {
                        alert("Error: " + JSON.stringify(err));
                    }

                    callback(err);
                });
            },
            function (callback) {
                // The dbs will be in a 0/ subdirectory. This is the initial
                // game version. Subsequent saves will go into 1/ etc.
                fs.mkdir(dbDir, function (err) {
                    if (err) {
                        alert("Error: " + JSON.stringify(err));
                        callback(err);
                    }

                    var manifestData = {
                        'name': 'Start from the beginning.'
                    };
        
                    writeInstanceManifest(dbDir, manifestData);
                    callback(null);
                });
            },
            function (callback) {
                // Export the game db entry.
                var gameDB = new Datastore(
                    { filename: path.join(dbDir, '/game.db'), autoload: true });

                gameDB.insert(gameData[0], function (err, newGame) {
                    if (err) {
                        alert("Error: " + JSON.stringify(err));
                        callback(err);
                    }

                    callback(null, newGame);
                });
            },
            function (newGame, callback) {
                // Export the realm db entries. Record the module dependencies
                // for use in subsequent stages.
                var manifestData = {
                    'name': newGame.name,
                    'description': newGame.description,
                };

                // Iterate over the game realms, exporting each in turn.
                async.eachSeries(
                    gameData[0].realms,
                    function (realmId, callback) {
                        db_collections.questrealms.find({ '_id': realmId }, function (err, realmData) {
                            if (err) {
                                console.error("Failed to find realm " + realmId);
                                callback(err);
                            }

                            var realmDB = new Datastore(
                                { filename: path.join(dbDir, '/questrealms.db'), autoload: true });
                            realmDB.insert(realmData[0], function (err, newRealm) {
                                if (err) {
                                    alert("Error: " + JSON.stringify(err));
                                    callback(err);
                                }

                                // Keep track of the module dependencies.
                                findRealmModules(newRealm, manifestData);

                                // Move on to the next realm.
                                callback();
                            });
                        });
                    },
                    function (err) {
                        // All done processing the realms, or aborted early with an error.
                        console.log("realms done. err: " + err + ", modules: " + JSON.stringify(manifestData));
                        if (err) {
                            callback(err);
                            return;
                        }

                        callback(err, manifestData)
                    }
                );
            },
            function (manifestData, callback) {
                // This function is synchronous, so no callback arg required.
                writeGameManifest(gameDir, manifestData);
                callback(null, manifestData);
            },
            function (manifestData, callback) {
                // This function is asynchronous, so needs a callback arg.
                exportModules(gameDir, manifestData, function (err) {
                    callback(err);
                });
            },
            function (callback) {
                console.log("before create zip file");
                createZipFile(gameDir, exportFileName, function () {
                    console.log("after create zip file");
                    callback();
                });
            },
            function (callback) {
                console.log("remove tmpdir");
                var rimraf = require('rimraf');
                rimraf(gameDir, function (err) {
                    callback(err);
                });
            }
        ],
        function (err) {
            // All done processing the games and realms, or aborted early with an error.
            if (err) {
                console.error("Failed to export game: " + err);
                alert("Failed to export game: " + err);
                return;
            }

            console.log("all done.");
            cleanAndHideExportGamePanel();
            alert("Exported game to " + gameDir);
        });
    });
}

// Extract the specified zipfile
// Uses decompress-zip: https://www.npmjs.com/package/decompress-zip
function extractZipFile(gameBasedir, filename, callback) {
    var fs = require('fs');

    // Add a trailing delimiter. This is required by fs.mkdtemp()
    // Although "/" is hardcoded, path.join() will use a platform-specific
    // delimiter.
    gameBasedir = path.join(gameBasedir, "/");
    // https://nodejs.org/api/fs.html
    fs.mkdtemp(gameBasedir, (err, tmpDir) => {
        if (err) throw err;

        // On windows mkdtemp() seems to create unix-format paths (with / delimiters).
        // Internally, decompress-zip uses path.join() to check the extracted files
        // and it uses the platform-specific delimiter (\ on windows), causing a
        // path comparison error on windows. Perform a dummy path.join() operation
        // to force the tmpDir to use the correct delimiters for your platform.
        tmpDir = path.join(tmpDir, "");

        console.log("game tempdir: " + tmpDir);
        var DecompressZip = require('decompress-zip');
        var unzipper = new DecompressZip(filename)

        unzipper.on('error', function (err) {
            console.log('Caught an error');
            callback(err)
        });

        unzipper.on('extract', function (log) {
            console.log('Finished extracting');
            callback(null, tmpDir)
        });

        unzipper.on('progress', function (fileIndex, fileCount) {
            console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
        });

        console.log("Extracting archive [" + filename + "] to [" + tmpDir + "]");
        unzipper.extract({
            path: tmpDir,
            restrict: true,
            filter: function (file) {
                console.log("File: " + JSON.stringify(file));
                return file.type !== "SymbolicLink";
            }
        });
    });
}

function importGame(filename, callback) {
    // Create a temporary working directory.
    var fs = require('fs');
    const app = electron.remote.app;
    var gameBasedir = path.join(app.getPath('userData'), "games");
    console.log("gameBasedir: " + gameBasedir);

    // Ensure the game parent directory exists.
    if (!fs.existsSync(gameBasedir)) {
        fs.mkdirSync(gameBasedir);
    }

    extractZipFile(gameBasedir, filename, function (err, tmpDir) {
        console.log("Post-extraction");
        if (err) {
            callback("Failed to extract game. error:" + err);
            return;
        }

        console.log("Extracted game into " + tmpDir);

        var errMsg = "";
        // Read the game name from manifest.json
        var manifest = readGameManifest(tmpDir);
        if (0 === Object.keys(manifest).length) {
            errMsg = "Failed to read manifest.json.";
        } else {
            // Security check - ensure the name hasn't been edited to
            // try and break out of the games sandbox.
            if (manifest.name.indexOf('../') !== -1) {
                errMsg = "Invalid name '" + manifest.name + "' in manifest.json.";
            }
        }

        // Cleanup after failures above.
        if (errMsg) {
            removeDirectory(tmpDir, function (err) {
                if (err) {
                    errMsg = "Failed to remove temp directory " + tmpDir;
                    console.error(errMsg);
                    callback(errMsg);
                    return;
                }

                console.log(errMsg);
                callback(errMsg);
                return;
            });
        }

        var newGameName = path.join(path.dirname(tmpDir), manifest.name);
        if (fs.existsSync(newGameName)) {
            removeDirectory(tmpDir, function (err) {
                if (err) {
                    var errMsg = "Failed to remove temp directory " + tmpDir;
                    console.error(errMsg);
                    callback(errMsg);
                    return;
                }

                var errMsg = "Game " + newGameName + " already exists";
                console.log(errMsg);
                callback(errMsg);
                return;
            });
        } else {
            console.log("rename " + tmpDir + " to " + newGameName);

            fs.rename(tmpDir, newGameName, function (err) {
                if (err) {
                    // TODO: clean up the tmp dir.
                    callback("Failed to rename " + tmpDir + " to " + newGameName + ", err: " + err);
                    return;
                }

                callback(null, manifest.name);
            });
        }
    });
}
