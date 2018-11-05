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
var availableGames = {};

var db_collections = {
    questrealms: null,
    games: null
}

// When the page has finished rendering...
$(document).ready(function() {

   // Load the avaialble games and call the functions below when they have been
   // retrieved. You need to use this callback approach because the AJAX calls are
   // asynchronous. This means the code here won't wait for them to complete,
   // so you have to provide a function that can be called when the data is ready.
   async.parallel([
       function(callback) {
           openDB(callback);
       },
       function(callback) {
            loadAndDisplayAvailableGames(callback);
       }
   ],
   function(err, results) {
      if (!err) enableControls();
   });

   // Allow creation of new games by handling clicks on the "New Game" button.
   // The jQuery selector $('#showCreateGameButton') selects the button by its "id" attribute.
   $('#showCreateGameButton').click(function() {
       console.log("showCreateGameButton.press");
      // $(this) is the button you just clicked.
      $(this).hide();
      $('#createGamePanel').show();
      $('#createGameButton').prop('disabled', false);
   });

   // Handle clicking the "Create!" button on the "New game" form.
   $('#createGameButton').click(function() {
      createGame()
   });

   // Only enable the export game button if a name has been specified.
   $('#exportGameName').on('keyup', function() {
      if ($(this).val().trim()) {
        $('#exportGameButton').prop('disabled', false);
      } else {
        $('#exportGameButton').prop('disabled', true);
      }
   });

   // Handle clicking the "Export" button on the "Export game" form.
   $('#exportGameButton').click(function() {
      exportGame()
   });
});


//
// Utility functions
//

function enableControls() {
    console.log("enableControls");
}


function openDB(callback) {
    var path = require('path');
    var dbPath = path.join(__dirname, "../../db/");

    db_collections.questrealms = new Datastore({ filename: dbPath + '/questrealms.db', autoload: true });
    console.log("after openDB, db_collections.questrealms = " + db_collections.questrealms);

    db_collections.games = new Datastore({ filename: dbPath + '/games.db', autoload: true });
    console.log("after openDB, db_collections.games = " + db_collections.games);

    callback();
}


function displayAvailableGames() {
    var header = "<table class='realmList'>";
    header += "<tr><th class='realmListName'>Name</th>";
    header += "<th class='realmListDescription'>Description</th>";
    header += "<th>Create Date</th>";
    header += "<th>Edit</th>";
    header += "<th>Delete</th>";
    header += "<th>Export</th>";

    var row = 0;
    var body = "";
    for (var key in availableGames)
    {
        if (!availableGames.hasOwnProperty(key)) {
            continue;
        }

        var thisGame = availableGames[key];
        var rowClass = "realmListOddRow";
        if (0 == (++row % 2)) rowClass = "realmListEvenRow";
        body += "<tr id='" + thisGame._id + "' class='" + rowClass + "'>";
        body += "<td class='gameName'>" + thisGame.name + "</td>";
        body += "<td>" + thisGame.description + "</td>";

        var updateTime = thisGame.updatedAt.toLocaleDateString(
            "en-GB", 
            {day: 'numeric', month: 'long', year: 'numeric',
             hour:'numeric', minute:'numeric', second:'numeric'});
        body += "<td>" + updateTime + "</td>";

        body += "<td><input type='button' class='editGame' value='Edit'/></td>";
        body += "<td><input type='button' class='deleteGame' value='Delete'/></td>";
        body += "<td><input type='button' class='exportGame' value='Export'/></td>";
        body += "</tr>";
    };

    $('#gameList').html("");
    $('.editGame').off();
    $('.deleteGame').off();
    $('.exportGame').off();

    if (body.length > 0) {
        $('#gameList').html(header + body);

        $('.editGame').on('click', function () {
            editGame($(this));
        });

        $('.deleteGame').on('click', function () {
            deleteGame($(this));
        });

        $('.exportGame').on('click', function () {
            // Record which game you are exporting.
            $('#exportGameId').val($(this).closest('tr').attr('id'));
            $('#exportGamePanel').show();
            $('#exportGameButton').prop('disabled', true);
        });
    }
}


function loadAndDisplayAvailableGames(callback) {
    db_collections.games.find({}, function (err, data) {
        console.log("loadAndDisplayAvailableGames found data: " + JSON.stringify(data));

        for (var i = 0; i < data.length; i++) {
            availableGames[data[i]._id] = data[i];
         }
 
         displayAvailableGames();
 
         if (callback) {
             callback();
         }
    });
}


function createGame() {
    var gameName = $('#gameName').val().trim();
    var gameDesc = $('#gameDescription').val().trim();

    // Disallow duplicate game names.
    // $.each() is a jQuery function to iterate over a collection, calling the supplied
    // function for each entry, passing in the array index and the array value.
    // We supply the collection using a jQuery selector that looks for a <td> with class
    // "gameName" on each row of any table inside the gameList div.
    var nameExists = false;
    $.each($('#gameList tr td.gameName'), function (index, value) {
        if ($(value).text() == gameName) {
            nameExists = true;
            return false; // Stop looping
        }
    });

    if (nameExists) {
        alert("That name is already in use");
        return;
    }

    cleanAndHideCreateGamePanel();

    // Create an empty game.
    var game = {
       name: gameName,
       description: gameDesc,
       realms: [],
       updatedAt: new Date(Date.now())
    };
    db_collections.games.insert(game, function (err, newGame) {
        if (err) {
            alert("Error: " + JSON.stringify(err));
            return;
        }

        console.log("created game: " + JSON.stringify(newGame));

        // Build a URL to invoke the game editor.
        var args = {url: 'file://' + __dirname + '/editGame.html',
                    data: {id: newGame._id}};
        ipc.send('edit-game', args);
    });
}


// The "Edit" button was clicked on one of the Games table rows.
function editGame(target) {
    // Build a URL to invoke the game editor, passing the id of the row that
    // was clicked. The jQuery selector target.closest('tr') traverses the
    // parents of the element that was clicked until it finds one of type "<tr>",
    // then we take its id value.
    var gameId = target.closest('tr').attr('id');

    // Send an ipc command to the main window to tell it to load new html.
    var args = {url: 'file://' + __dirname + '/editGame.html',
                data: {id: gameId}};
    ipc.send('edit-game', args);
}


// Clear any data that was typed into the "Create Game" form so that it is
// blank the next time it is displayed.
function cleanAndHideCreateGamePanel()
{
    // Select the panel using its 'id' attribute.
    var panel = $('#createGamePanel');
    panel.hide();
    // Find all the text fields on the panel and clear their contents.
    panel.find('input[type=text]').val('');
}


// The "Delete" button was pressed on a row in the "Games" table.
function deleteGame(target) {
    // Find the name and id of the game in question by navigating to the
    // relevent form elements. See the explanations of jQuery selectors
    // above for more details.
    var name = $(target.closest('tr').find('td')[0]).text();
    var id = target.closest('tr').attr('id');

    if (confirm("Are you sure you want to delete game " + name + "?")) {
        db_collections.games.remove ({_id:id}, function (err, numRemoved) {
            if (err) {
                console.error("Failed to delete game. Error: " + err);
                return;
            }

            if (!numRemoved) {
                console.error("Failed to delete game.");
                return;
            }

            // Remove the deleted realm from the local collection rather
            // than reloading all from the db.
            for (var key in availableGames)
            {
                if (!availableGames.hasOwnProperty(key)) {
                    // Should never happen.
                    continue;
                }

                if (key === id) {
                    delete availableGames[key];
                    break;
                }
            }

            displayAvailableGames();
        });
    }
}


// Clear any data that was typed into the "Export Game" form so that it is
// blank the next time it is displayed.
function cleanAndHideExportGamePanel()
{
    // Select the panel using its 'id' attribute.
    var panel = $('#exportGamePanel');
    panel.hide();
    // Find all the text fields on the panel and clear their contents.
    panel.find('input[type=text]').val('');
}


// Export the modules required by this game.
function exportModules(tmpDir, moduleRequirements, exportCallback) {
    console.log("export modules");
    var fs = require('fs');
    var targetPathRoot = path.join(tmpDir, "/modules");

    fs.mkdir(targetPathRoot, {recursive: false}, (err) => {
        if (err) {
            exportCallback(err);
            return;
        }

        var sourcePathRoot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
        var ncp = require('ncp').ncp;
        ncp.limit = 16;
    
        async.forEachOf(
            moduleRequirements.modules,
            function(moduleDetails, moduleName, callback) {
                if (!moduleRequirements.modules.hasOwnProperty(moduleName)) {           
                    callback();
                    return;
                }

                // Export the whole module.
                var targetPath = path.join(targetPathRoot, moduleName);
                var sourcePath = path.join(sourcePathRoot, moduleName);
                console.log("trying to export module " + sourcePath + " to " + targetPath);

                fs.mkdir(targetPath, {recursive: false}, (err) => {
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
            function(err) {
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
    newRealm.mapLocations.forEach(function(mapLocation) {
        updateCollectionModules(mapLocation, moduleRequirements);

        // Cover the items and characters from each map location.
        mapLocation.items.forEach(function(item) {
            updateCollectionModules(item, moduleRequirements);
        });

        mapLocation.characters.forEach(function(character) {
            updateCollectionModules(character, moduleRequirements);
        });
    });

    console.log("leaving updateRealmModules: " + JSON.stringify(moduleRequirements));
}


// Write a file that contains a list of all the
// <module / filename / type> requirements of this game.
// This is just a human-readable helpful guide - the system
// won't use this file when importing a game, but will instead
// generate the manifest at import time to be sure it is in sync
// what the actual requirements from the database.
function writeGameManifest(tmpdir, moduleRequirements) {
    var fs = require('fs');

    try {
        fs.appendFileSync(tmpdir + '/manifest.json', JSON.stringify(moduleRequirements));
        console.log('manifest.json created.');
    } catch (err) {
        /* Handle the error */
        console.error("Failed to create manifest.json: " + err);
    }
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
    output.on('close', function() {
        console.log(archive.pointer() + ' total bytes');
        callback();
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function() {
        console.log('Data has been drained');
    });

    // Good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
        if (err.code === 'ENOENT') {
           // log warning
        } else {
           // throw error
        throw err;
        }
    });
    
    // Good practice to catch this error explicitly
    archive.on('error', function(err) {
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


function exportGame() {
    // Create a temporary working directory.
    var fs = require('fs');
    var os = require('os');

    // https://nodejs.org/api/fs.html
    fs.mkdtemp(path.join(os.tmpdir(), 'questexport-'), (err, tmpDir) => {
        if (err) throw err;

        // Export the game and the realms from the master db.
        var gameId = $('#exportGameId').val().trim();
        var gameDB = new Datastore({ filename: tmpDir + '/game.db', autoload: true });
        var realmDB = new Datastore({ filename: tmpDir + '/questrealms.db', autoload: true });
        var exportFileName = $('#exportGameName').val();

        db_collections.games.find({'_id': gameId}, function (err, gameData) {    
            if (err) {
                console.error("Failed to find db");
                return;
            }
    
            // There are several steps in the game export process, which must happen
            // in sequence, despite some being asynchronous.
            async.waterfall([
                function(callback) {
                    // Export the game db entry.
                    gameDB.insert(gameData[0], function (err, newGame) {
                        if (err) {
                            alert("Error: " + JSON.stringify(err));
                            callback(err);
                        }

                        callback(null);
                    });
                },
                function(callback) {
                    // Export the realm db entries. Record the module dependencies
                    // for use in subsequent stages.
                    var moduleRequirements = {};

                    // Iterate over the game realms, exporting each in turn.
                    async.eachSeries(
                        gameData[0].realms,
                        function(realmId, callback) {    
                            db_collections.questrealms.find({'_id': realmId}, function (err, realmData) {
                                if (err) {
                                    console.error("Failed to find realm " + realmId);
                                    callback(err);
                                }
                                
                                realmDB.insert(realmData[0], function (err, newRealm) {
                                    if (err) {
                                        alert("Error: " + JSON.stringify(err));
                                        callback(err);
                                    }

                                    // Keep track of the module dependencies.
                                    findRealmModules(newRealm, moduleRequirements);

                                    // Move on to the next realm.
                                    callback();
                                });
                            });
                        },
                        function(err) {
                            // All done processing the realms, or aborted early with an error.
                            console.log("realms done. err: " + err + ", modules: " + JSON.stringify(moduleRequirements));
                            if (err) {
                               callback(err);
                               return;
                            }

                            callback(err, moduleRequirements)
                        }
                    );
                },
                function(moduleRequirements, callback) {
                    // This function is synchronous, so no callback arg required.
                    writeGameManifest(tmpDir, moduleRequirements);
                    callback(null, moduleRequirements);
                },
                function(moduleRequirements, callback) {
                    // This function is asynchronous, so needs a callback arg.
                    exportModules(tmpDir, moduleRequirements, function(err) {
                        callback(err);
                    });
                },
                function(callback) {
                    console.log("before create zip file");
                    createZipFile(tmpDir, exportFileName, function() {
                        console.log("after create zip file");
                        callback();
                    });
                },
                function(callback) {
                    console.log("remove tmpdir");
                    var rimraf = require('rimraf');
                    rimraf(tmpDir, function(err) {
                        callback(err);
                    });
                }
            ],
            function(err) {
                // All done processing the games and realms, or aborted early with an error.
                if (err) {
                    console.error("Failed to export game: " + err);
                    return;
                }

                console.log("all done.");
                cleanAndHideExportGamePanel();
                alert("Exported game to " + os.tmpdir() + "/" + exportFileName);
            });
        });
    });
}
