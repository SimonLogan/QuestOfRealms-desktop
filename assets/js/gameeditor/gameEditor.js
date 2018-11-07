/**
 * Created by Simon on 29/09/2018.
 * This file implements the interactions for the game editor page.
 * (c) Simon Logan 2018
 */

"use strict";

window.$ = window.jQuery = require('jquery');
require('jqueryui');
const async = require('async');
const ipc = require('electron').ipcRenderer;
const dbWrapper = require('../../assets/js/utils/dbWrapper');

var gameData;
var availableRealms = {};

const TableDisplayMode = {
    SHOW_WHEN_EMPTY : 0,
    HIDE_WHEN_EMPTY : 1
}

// Called when the realm editor is loaded.
ipc.on('editGame-data', function (event, data) {
    //ipc.send('logmsg', 'realmEditor.js:editRealm-data. data=' + JSON.stringify(data));

   // Load the game and available relams and call the functions below when they have been
   // retrieved. You need to use this callback approach because the AJAX calls are
   // asynchronous. This means the code here won't wait for them to complete,
   // so you have to provide a function that can be called when the data is ready.
   var x = new Date();
   console.log("********** starting editGame-data " + x + "(" + Date.now() + ") **********")
   async.waterfall([
        function(callback) {
            dbWrapper.openDB(callback);
        },
        function(callback) {
            loadAndDisplayAvailableRealms(callback);
        },
        function(callback) {
            loadAndDisplayGame(data.id, callback);
        }
    ],
    function(err, results) {
        // Create the tabbed panels
        if (!err) enableControls();
    });

    // Navigate back.
    $(document).on('click', '#breadcrumb', function(e) {
        ipc.send('frontpage');
    });
});


//
// Utility functions
//

function enableControls() {
    $('#gameName').text("Game Designer: Editing game " + gameData.name);

    $('#saveButton').on('click', function() {
        updateGameRealms();
    });

    // Allow creation of new realms by handling clicks on the "New Realm" button.
    // The jQuery selector $('#showCreateRealmDesignButton') selects the button by its "id" attribute.
    $('#showCreateRealmDesignButton').click(function() {
        // $(this) is the button you just clicked.
        $(this).hide();
        $('#realmDesignContainer').show();
        $('#createRealmButton').prop('disabled', false);
    });

     // Handle clicking the "Create!" button on the "New Realm" form.
    $('#createRealmButton').click(function() {
        createRealmDesign(function(newRealm) {
            $('#createRealmDesignPanel').hide();
            availableRealms[newRealm._id] = newRealm;
            displayAvailableRealms();
        });
    });

    // Allow creation of new games by handling clicks on the "New Game" button.
    // The jQuery selector $('#showCreateGameButton') selects the button by its "id" attribute.
    $('#showCreateGameButton').click(function() {
        // $(this) is the button you just clicked.
        $(this).hide();
        $('#gameDesignContainer').show();
        $('#createGameButton').prop('disabled', false);
    });

    // Handle clicking the "Create!" button on the "New game" form.
    $('#createGameButton').click(function() {
        createGame();
    });
}


function displayGameDetails(displayMode) {
    console.log("displayGameDetails() mode=" + displayMode);

    var header = "<table class='realmList'>";
    header += "<tr><th class='realmListName'>Name</th>";
    header += "<th class='realmListDescription'>Description</th>";
    header += "<th>Remove</th>";
    header += "<th colspan='2'>Move</th>";

    // Remove any existing button click handlers.
    $('.removeFromGame').off();
    $('.moveUp').off();
    $('.moveDown').off();

    var row = 0;
    var body = "";
    for (var i = 0; i < gameData.realms.length; i++) {
        var realmId = gameData.realms[i];
        var rowClass = "realmListOddRow";
        if (0 == (++row % 2)) rowClass = "realmListEvenRow";

        // For now this table only displays the realm name and description, and we only
        // need to be able to add and remove realms from the game table. No need to store
        // any further details of the realm in this table.
        // data-realmId links to id on the available realms table, so we can
        // check if the row already exists in the game table.
        body += "<tr data-realmId='" + realmId + "' class='" + rowClass + "'>";
        body += "<td>" + availableRealms[realmId].name + "</td>";
        body += "<td>" + availableRealms[realmId].description + "</td>";
        body += "<td align='center'><input type='button' class='removeFromGame' value='Remove'/></td>";

        if (i == 0) {
            body += "<td></td>";
        } else {
            body += "<td align='center'><input type='button' class='moveUp' value='Move Up'/></td>";
        }

        if (i < gameData.realms.length - 1) {
            body += "<td align='center'><input type='button' class='moveDown' value='Move Down'/></td>";
        } else {
            body += "<td></td>";
        }

        body += "</tr>";
    };

    $('#gameRealmsList').html(header + body);
    if (body.length === 0) {
        if (displayMode !== undefined && displayMode === TableDisplayMode.HIDE_WHEN_EMPTY) {
            $('#realmsInGamePanel').hide();
        }
    } else {
        $('#realmsInGamePanel').show();

        $('.removeFromGame').on('click', function () {
            removeFromGame($(this));
        });

        $('.moveUp').on('click', function () {
            moveRealmUp($(this));
        });

        $('.moveDown').on('click', function () {
            moveRealmDown($(this));
        });
    }
}


function loadAndDisplayGame(gameId, callback)
{
    console.log(Date.now() + ' loadAndDisplayGame');

    var db_collections = dbWrapper.getDBs();
    db_collections.games.find({_id: gameId}, function (err, data) {
        ipc.send('logmsg', "loadGame found data: " + JSON.stringify(data));
        gameData = data[0];
        $('#breadcrumb').attr('data-gameId', gameData._id);
        $('#page_title').text("Edit Game " + gameData.name);
        displayGameDetails(TableDisplayMode.HIDE_WHEN_EMPTY);
        callback(null);
    });
}


function saveGame(callback)
{
    console.log(Date.now() + ' saveGame');

    var db_collections = dbWrapper.getDBs();
    db_collections.games.update({_id: gameData._id}, gameData, {}, function (err, numReplaced) {
        console.log("saveGame err:" + err);
        console.log("saveGame numReplaced:" + numReplaced);
        callback(null);
    });
}


function displayAvailableRealms() {
    // Create the body of the "Realm Designs" table.
    var header = "<table class='realmList'>";
    header += "<tr><th class='realmListName'>Name</th>";
    header += "<th class='realmListDescription'>Description</th>";
    header += "<th>Create Date</th>";
    header += "<th>Edit</th>";
    header += "<th>Delete</th>";
    header += "<th>Add to Game</th>";

    // Remove any existing "add" button click handlers.
    $('.editRealmDesign').off();
    $('.deleteRealmDesign').off();
    $('.addToGame').off();

    // Add a row to the table for each realm that the server sent back.
    var row = 0;
    var body = "";
    for (var key in availableRealms)
    {
        if (!availableRealms.hasOwnProperty(key)) {
            continue;
        }

        var thisRealm = availableRealms[key];
        var rowClass = "realmListOddRow";

        // Make even numbered table rows a different colour.
        if (0 == (++row % 2)) rowClass = "realmListEvenRow";
        body += "<tr id='" + thisRealm._id + "' class='" + rowClass + "'>";
        body += "<td>" + thisRealm.name + "</td>";
        body += "<td>" + thisRealm.description + "</td>";
        body += "<td>" + thisRealm.updatedAt.toLocaleString('en-GB') + "</td>";
        body += "<td><input type='button' class='editRealmDesign' value='Edit'/></td>";
        body += "<td><input type='button' class='deleteRealmDesign' value='Delete'/></td>";
        body += "<td align='center'><input type='button' class='addToGame' value='Add'/></td>";
        body += "</tr>";
    };

    if (body.length === 0) {
        $('#availableRealmsList').html("");
        //$('#realmDesignsPanel').hide();
    } else {
        // A jQuery selector $('#XXX') selects an HTML element using its 'id' attribute.
        $('#availableRealmsList').html(header + body);
        $('#realmDesignsPanel').show();

        // Now add the new handler functions for the buttons on the new table rows.
        $('.editRealmDesign').on('click', function () {
            editRealmDesign($(this));
        });

        $('.deleteRealmDesign').on('click', function () {
            var realmId = $(this).closest('tr').attr('id');
            deleteRealmDesign($(this), function(numRemoved) {
                if (!numRemoved) {
                    console.log("Failed to delete realm");
                    return;
                }

                // Remove the deleted realm from the local collection rather
                // than reloading all from the db.
                for (var key in availableRealms)
                {
                    if (!availableRealms.hasOwnProperty(key)) {
                        // Should never happen.
                        continue;
                    }

                    if (key === realmId) {
                        delete availableRealms[key];
                        break;
                    }
                }

                displayAvailableRealms();
            });
        });

        $('.addToGame').on('click', function () {
            addToGame($(this));
        });
    }
}


function loadAndDisplayAvailableRealms(callback) {
    var db_collections = dbWrapper.getDBs();
    db_collections.questrealms.find({}, function (err, data) {
        console.log("loadAndDisplayAvailableRealms found data: " + JSON.stringify(data));
        
        for (var i = 0; i < data.length; i++) {
           availableRealms[data[i]._id] = data[i];
        }

        displayAvailableRealms();

        if (callback) {
            callback();
        }
    });
}


// Check that the specified realm meets the criteria for inclusion in a game:
// - it must have a valid "start at" objective.
function checkRealm(realmId) {
    console.log("********************* in checkRealm. id = " + realmId);

    if (!realmId in availableRealms) {
        // Should only happen if there is a programming error.
        alert("Realm does not exist");
    }

    // Check the 'start at' objective.
    // The realm must have at least a "start at" objective before a game can be created.
    var realm = availableRealms[realmId];
    var startPoint = null;
    if (realm.objectives) {
        for (var i = 0; i < realm.objectives.length; i++) {
            if (realm.objectives[i].type === "Start at") {
                startPoint = realm.objectives[i];
                break;
            }
        }
    }

    if (null === startPoint) {
        console.log("checkRealm: no \"start at\" objective set.");
        alert("No \"start at\" objective set");
        return false;
    }

    // Don't validate that the maplocation actually exists, as that was done when
    // adding the "start at" objective.
    // TODO: Could the location be removed after adding the objective?
    console.log("checkRealm: realmId: " + realm._id +
                " startpoint: " +
                " x:" + startPoint.params[0].value +
                " y:" + startPoint.params[1].value);

    return true;
}


function addToGame(target) {
    console.log("Add to game");
    var realmId = target.closest("tr").attr('id');

    if (gameData.realms.indexOf(realmId) >= 0) {
       // The realm is already in the game.
       return;
    }

    // Check the realm to ensure it is valid for adding to the game.
    // If not, disable the button so the check doesn't have to be repeated.
    if (!checkRealm(realmId)) {
        // Will have already shown an error message.
        return;
    }

    gameData.realms.push(realmId);
    // Automatic save
    saveGame(function() {
        displayGameDetails();
    });
}


function removeFromGame(target) {
    console.log("Remove from game");
    var realmId = target.closest("tr").attr('data-realmId');
    var gameRealmIndex = gameData.realms.indexOf(realmId);
    if (gameRealmIndex < 0) {
        // The realm is not in the game.
        return;
     }

    gameData.realms.splice(gameRealmIndex, 1);

    // Automatic save
    saveGame(function() {
    displayGameDetails(TableDisplayMode.SHOW_WHEN_EMPTY);
    return;
    }) 
}


function moveRealmUp(target) {
    console.log("Move realm up");
    var realmId = target.closest("tr").attr('data-realmId');
    var gameRealmIndex = gameData.realms.indexOf(realmId);
    if (gameRealmIndex < 0) {
       // The realm is not in the game.
       return;
    }

    // If we're moving an item up, start searching at the 2nd position.
    var temp = gameData.realms[gameRealmIndex - 1];
    gameData.realms[gameRealmIndex - 1] = gameData.realms[gameRealmIndex];
    gameData.realms[gameRealmIndex] = temp;
    // Automatic save
    saveGame(function() {
     displayGameDetails(TableDisplayMode.SHOW_WHEN_EMPTY);
     return;
    });
}


function moveRealmDown(target) {
    console.log("Move realm down");
    var realmId = target.closest("tr").attr('data-realmId');
    var gameRealmIndex = gameData.realms.indexOf(realmId);
    if (gameRealmIndex < 0) {
       // The realm is not in the game.
       return;
    }

    var temp = gameData.realms[gameRealmIndex + 1];
    gameData.realms[gameRealmIndex + 1] = gameData.realms[gameRealmIndex];
    gameData.realms[gameRealmIndex] = temp;
    // Automatic save
    saveGame(function() {
    displayGameDetails(TableDisplayMode.SHOW_WHEN_EMPTY);
    return;
    })
}
