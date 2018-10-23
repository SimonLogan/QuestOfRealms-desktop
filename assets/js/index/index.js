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
const BrowserWindow = electron.remote.BrowserWindow;

var Datastore = require('nedb');
var availableGames = {};

var db_collections = {
    questrealms: null
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
        body += "</tr>";
    };

    $('#gameList').html("");
    $('.editGame').off();
    $('.deleteGame').off();
    $('.createInstance').off();

    if (body.length > 0) {
        $('#gameList').html(header + body);

        $('.editGame').on('click', function () {
            editGame($(this));
        });

        $('.deleteGame').on('click', function () {
            deleteGame($(this));
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
