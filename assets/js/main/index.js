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
$(document).ready(function() {
    // Load the data and call the functions below when it has been
    // retrieved. You need to use this callback approach because the AJAX calls are
    // asynchronous. This means the code here won't wait for them to complete,
    // so you have to provide a function that can be called when the data is ready.
    // TODO: Only do this the first time design mode is selected.
    async.waterfall([
        function(callback) {
            dbWrapper.openDB(callback);
        },
        function(callback) {
            loadAndDisplayAvailableGameDesigns(callback);
        },
        function(callback) {
            loadAndDisplayAvailableGames(callback);
        },
    ],
    function(err, results) {
        if (!err) enableControls();
    });

    $('#designMode').on('click', function() {
        $(this).prop('disabled', true);
        $('#designContainer').show();
        $('#gameMode').prop('disabled', false);
        $('#playContainer').hide();
    });

    $('#gameMode').on('click', function() {
        $(this).prop('disabled', true);
        $('#playContainer').show();
        $('#designMode').prop('disabled', false);
        $('#designContainer').hide();
    });

   // Allow creation of new games by handling clicks on the "New Game" button.
   // The jQuery selector $('#showCreateGameButton') selects the button by its "id" attribute.
   $('#showCreateGameButton').click(function() {
       console.log("showCreateGameButton.press");
      // $(this) is the button you just clicked.
      $(this).hide();
      $('#createGameDesignPanel').show();
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
      exportGame();
   });


   // Handle clicking the "Import" button on the Game form.
   $('#importGameButton').click(function() {
      const {dialog} = require('electron').remote;

      dialog.showOpenDialog({
          properties: ['openFile']
      }, function (chosenPath) {
          if (chosenPath !== undefined) {
              importGame(chosenPath[0], function(err, gameName) {
                  if (err) {
                      alert(err);
                      return;
                  }

                  // Refresh the games table.
                  loadAndDisplayAvailableGames(function() {});
              });
          }
      });
   });

});


//
// Utility functions
//

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
    for (var key in availableGameDesigns)
    {
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
            {day: 'numeric', month: 'long', year: 'numeric',
             hour:'numeric', minute:'numeric', second:'numeric'});
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


function displayAvailableGames() {
    console.log(JSON.stringify(availableGames));

    var header = "<table class='realmList'>";
    header += "<tr><th class='realmListName'>Name</th>";
    header += "<th class='realmListDescription'>Description</th>";
    header += "<th>Play</th>";
    header += "<th>Delete</th>";

    var row = 0;
    var body = "";
    for (var i=0; i<availableGames.length; i++)
    {
        var thisGame = availableGames[i];
        var rowClass = "realmListOddRow";
        if (0 == (++row % 2)) rowClass = "realmListEvenRow";
        body += "<tr id='" + i + "' class='" + rowClass + "'>";
        body += "<td class='gameName'>" + thisGame.manifest.name + "</td>";
        body += "<td>" + thisGame.manifest.description + "</td>";
        body += "<td><input type='button' class='playGame' value='Play'/></td>";
        body += "<td><input type='button' class='deleteGame' value='Delete'/></td>";
        body += "</tr>";
    };

    $('#gameList').html("");
    $('.deleteGame').off();
    $('.playGame').off();

    if (body.length > 0) {
        $('#gameList').html(header + body);

        $('.deleteGame').on('click', function () {
            deleteGame($(this));
        });

        $('.playGame').on('click', function () {
            // Record which game you are exporting.
            //$('#exportGameId').val($(this).closest('tr').attr('id'));
            //$('#exportGamePanel').show();
            //$('#exportGameButton').prop('disabled', true);
        });
    }
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

    // from https://stackoverflow.com/questions/18112204/get-all-directories-within-directory-nodejs
    const { lstatSync, readdirSync } = require('fs');
    const path = require('path');
    const isDirectory = source => lstatSync(path.resolve(gameBasedir, source)).isDirectory();
    // is equivalent to
    // const isDirectory = function(source) { return lstatSync(path.resolve(gameBasedir, source)).isDirectory() };
    // I don't find the shorter syntax terribly helpful.

    const getDirectories = source => readdirSync(source).filter(isDirectory);
    var res = getDirectories(gameBasedir);
    availableGames = [];
    $.each(res, function(index, dirname) {
        var gamePath = path.join(gameBasedir, dirname);
        console.log("Checking game at path:" + gamePath);

        var manifest = readManifest(gamePath);
        if (0 === Object.keys(manifest).length) {
           console.error("Ignoring path " + gamePath + " - Failed to read manifest.json.");
           return;
        }

        availableGames.push({'dir': dirname, 'manifest': manifest});
    });

    // This need to wait until the manifests have been read.
    // Ideally change readManifest() to be synchronous. 
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
        var args = {url: 'file://' + __dirname + '/../gameEditor/editGame.html',
                    data: {id: newGame._id}};
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
    var args = {url: 'file://' + __dirname + '/../gameEditor/editGame.html',
                data: {id: gameId}};
    ipc.send('edit-game', args);
}


// Clear any data that was typed into the "Create Game" form so that it is
// blank the next time it is displayed.
function cleanAndHideCreateGameDesignPanel()
{
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
        db_collections.games.remove ({_id:id}, function (err, numRemoved) {
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
            for (var key in availableGameDesigns)
            {
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


// The "Delete" button was pressed on a row in the "Games" table.
function deleteGame(target) {
    // Find the name and id of the game in question by navigating to the
    // relevent form elements. See the explanations of jQuery selectors
    // above for more details.
    var name = $(target.closest('tr').find('td')[0]).text();
    if (confirm("Are you sure you want to delete game " + name + "?")) {
        var id = target.closest('tr').attr('id');
        removeGameDirectory(id, function(err) {
            if (!err) {
                displayAvailableGames();
            }
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


// Remove the game from the filesystem.
function removeGameDirectory(gameId, callback) {
    const app = electron.remote.app;
    var gameDir = app.getPath('userData') + "/games/" + availableGames[gameId].dir;
    console.log("removeGameDirectory game name: " +
                availableGames[gameId].manifest.name +
                ", dir: " + gameDir);

    var rimraf = require('rimraf');
    rimraf(gameDir, function(err) {
        if (err) {
            var errMsg = "Failed to remove game directory " + gameDir;
            console.error(errMsg);
            callback(errMsg);
            return;
        }

        availableGames.splice(gameId, 1);
        callback();
    });
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
function writeGameManifest(tmpdir, manifestData) {
    var fs = require('fs');

    try {
        fs.appendFileSync(tmpdir + '/manifest.json', JSON.stringify(manifestData));
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


function exportGame_orig() {
    // Create a temporary working directory.
    var fs = require('fs');
    var os = require('os');
    const app = electron.remote.app;

    // https://nodejs.org/api/fs.html
    fs.mkdtemp(path.join(os.tmpdir(), 'questexport-'), (err, tmpDir) => {
        if (err) throw err;

        // Export the game and the realms from the master db.
        var gameId = $('#exportGameId').val().trim();
        var gameDB = new Datastore({ filename: tmpDir + '/game.db', autoload: true });
        var realmDB = new Datastore({ filename: tmpDir + '/questrealms.db', autoload: true });
        var exportFileName = $('#exportGameName').val();

        var db_collections = dbWrapper.getDBs();
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

                        callback(null, newGame);
                    });
                },
                function(newGame, callback) {
                    // Export the realm db entries. Record the module dependencies
                    // for use in subsequent stages.
                    var manifestData = {
                        'name': newGame.name,
                        'description': newGame.description,
                    };

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
                                    findRealmModules(newRealm, manifestData);

                                    // Move on to the next realm.
                                    callback();
                                });
                            });
                        },
                        function(err) {
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
                function(manifestData, callback) {
                    // This function is synchronous, so no callback arg required.
                    writeGameManifest(tmpDir, manifestData);
                    callback(null, manifestData);
                },
                function(manifestData, callback) {
                    // This function is asynchronous, so needs a callback arg.
                    exportModules(tmpDir, manifestData, function(err) {
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

function exportGame() {
    // Create a temporary working directory.
    var fs = require('fs');
    const app = electron.remote.app;
    var gameBasedir = app.getPath('userData') + "/exported-games/";

    // Export the game and the realms from the master db.
    var exportFileName = $('#exportGameName').val();
    var gameDir = path.join(gameBasedir, exportFileName);
    var gameId = $('#exportGameId').val().trim();

    var db_collections = dbWrapper.getDBs();
    db_collections.games.find({'_id': gameId}, function (err, gameData) {    
        if (err) {
            console.error("Failed to find db");
            return;
        }

        // There are several steps in the game export process, which must happen
        // in sequence, despite some being asynchronous.
        async.waterfall([
            function(callback) {
                var fullExportFileName = path.join(gameBasedir, exportFileName + ".zip");
                fs.access(fullExportFileName, fs.constants.F_OK, function(err) {
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
            function(callback) {
                fs.mkdir(gameBasedir, function(err) {
                    if (err && err.code !== "EEXIST") {
                        console.log("Info: " + JSON.stringify(err));
                    }

                    callback(null);
                });
            },
            function(callback) {
                fs.mkdir(gameDir, function(err) {
                    if (err) {
                        alert("Error: " + JSON.stringify(err));
                    }

                    callback(err);
                });
            },
            function(callback) {
                // Export the game db entry.
                var gameDB = new Datastore({ filename: gameDir + '/game.db', autoload: true });

                gameDB.insert(gameData[0], function (err, newGame) {
                    if (err) {
                        alert("Error: " + JSON.stringify(err));
                        callback(err);
                    }

                    callback(null, newGame);
                });
            },
            function(newGame, callback) {
                // Export the realm db entries. Record the module dependencies
                // for use in subsequent stages.
                var manifestData = {
                    'name': newGame.name,
                    'description': newGame.description,
                };

                // Iterate over the game realms, exporting each in turn.
                async.eachSeries(
                    gameData[0].realms,
                    function(realmId, callback) {    
                        db_collections.questrealms.find({'_id': realmId}, function (err, realmData) {
                            if (err) {
                                console.error("Failed to find realm " + realmId);
                                callback(err);
                            }
                            
                            var realmDB = new Datastore({ filename: gameDir + '/questrealms.db', autoload: true });
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
                    function(err) {
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
            function(manifestData, callback) {
                // This function is synchronous, so no callback arg required.
                writeGameManifest(gameDir, manifestData);
                callback(null, manifestData);
            },
            function(manifestData, callback) {
                // This function is asynchronous, so needs a callback arg.
                exportModules(gameDir, manifestData, function(err) {
                    callback(err);
                });
            },
            function(callback) {
                console.log("before create zip file");
                createZipFile(gameDir, exportFileName, function() {
                    console.log("after create zip file");
                    callback();
                });
            },
            function(callback) {
                console.log("remove tmpdir");
                var rimraf = require('rimraf');
                rimraf(gameDir, function(err) {
                    callback(err);
                });
            }
        ],
        function(err) {
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

    // https://nodejs.org/api/fs.html
    fs.mkdtemp(gameBasedir, (err, tmpDir) => {
        if (err) throw err;

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
        
        unzipper.extract({
            path: tmpDir,
            filter: function (file) {
                console.log("File: " + JSON.stringify(file));
                return file.type !== "SymbolicLink";
            }
        });
    });
}


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


function importGame(filename, callback) {
    // Create a temporary working directory.
    var fs = require('fs');
    const app = electron.remote.app;
    var gameBasedir = app.getPath('userData') + "/games/";
    console.log("gameBasedir: " + gameBasedir);
    
    // Ensure the game parent directory exists.
    if (!fs.existsSync(gameBasedir)) {
        fs.mkdirSync(gameBasedir);
    }

    extractZipFile(gameBasedir, filename, function(err, tmpDir) {
        console.log("Post-extraction");
        if (err) {
            callback("Failed to extract game. error:" + err);
            return;
        }

        console.log("Extracted game into " + tmpDir);

        // Read the game name from manifest.json
        var manifest = readManifest(tmpDir);
        if (0 === Object.keys(manifest).length) {
            // TODO: clean up the tmp dir.
            callback("Failed to read manifest.json.");
            return;
        }

        // Security check - ensure the name hasn't been edited to
        // try and break out of the games sandbox.
        if (manifest.name.indexOf('../') !== -1) {
            callback("Invalid name '" + manifest.name + "' in manifest.json.");
            return;
        }

        var newGameName = path.join(path.dirname(tmpDir), manifest.name);
        console.log("rename " + tmpDir + " to " + newGameName);

        fs.rename(tmpDir, newGameName, function(err) {
            if (err) {
                // TODO: clean up the tmp dir.
                callback("Failed to rename " + tmpDir + " to " + newGameName + ", err: " + err);
                return;
            }

            callback(null, manifest.name);
        });
    });
}
