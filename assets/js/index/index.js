/**
 * Created by Simon on 13 May 2018.
 * This file implements the interactions for the QuestOfRealms designer main page.
 * (c) Simon Logan
 */

window.$ = window.jQuery = require('jquery');
const async = require('async');
const electron = require('electron');
const ipc = electron.ipcRenderer;
const BrowserWindow = electron.remote.BrowserWindow;

var Datastore = require('nedb');
var availableRealms = {};

var db_collections = {
    questrealms: null
}

// When the page has finished rendering...
$(document).ready(function() {

   // Load the game and avaialble realms and call the functions below when they have been
   // retrieved. You need to use this callback approach because the AJAX calls are
   // asynchronous. This means the code here won't wait for them to complete,
   // so you have to provide a function that can be called when the data is ready.
   async.parallel([
       function(callback) {
           openDB(callback);
       },
       function(callback) {
           loadAndDisplayAvailableRealms(callback);
       },
       function(callback) {
           loadGames(callback);
       }/*,
       function(callback) {
           loadGameInstances(callback);
       },*/
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

   // Handle clicking the "Create!" button on the "New game instance" form.
   $('#createGameInstanceButton').click(function() {
      createGameInstance()
   });
});


//
// Utility functions
//

function enableControls() {
    console.log("enableControls");

    // Allow creation of new realms by handling clicks on the "New Realm" button.
    // The jQuery selector $('#showCreateRealmDesignButton') selects the button by its "id" attribute.
    $('#showCreateRealmDesignButton').click(function() {
        // $(this) is the button you just clicked.
        console.log("showCreateRealmDesignButton.press");
        $(this).hide();
        $('#realmDesignContainer').show();
        $('#createRealmButton').prop('disabled', false);
    });

     // Handle clicking the "Create!" button on the "New Realm" form.
    $('#createRealmButton').click(function() {
        createRealmDesign(db_collections, function() {
            loadAndDisplayAvailableRealms();
            cleanAndHideCreateRealmPanel();
            //$('#realmDesignContainer').hide();
            $('#showCreateRealmDesignButton').show();
        });
    });
}


function openDB(callback) {
    var path = require('path');
    var dbPath = path.join(__dirname, "../../db/");

    db_collections.questrealms = new Datastore({ filename: dbPath + '/questrealms.db', autoload: true });
    console.log("after openDB, db_collections.questrealm = " + db_collections.questrealms);

    db_collections.games = new Datastore({ filename: dbPath + '/games.db', autoload: true });
    console.log("after openDB, db_collections.games = " + db_collections.games);

    callback();
}


function loadAndDisplayAvailableRealms(callback) {
    db_collections.questrealms.find({}, function (err, data) {
        console.log("loadAndDisplayAvailableRealms found data: " + JSON.stringify(data));

        // Create the body of the "Realm Designs" table.
        var header = "<table class='realmList'>";
        header += "<tr><th class='realmListName'>Name</th>";
        header += "<th class='realmListDescription'>Description</th>";
        header += "<th>Create Date</th>";
        header += "<th>Edit</th>";
        header += "<th>Delete</th>";

        // Remove any existing "add" button click handlers.
        $('.editRealmDesign').off();
        $('.deleteRealmDesign').off();
        $('.addToGame').off();

        // Add a row to the table for each realm that the server sent back.
        var row = 0;
        var body = "";
        for (var i = 0; i < data.length; i++) {
            availableRealms[data[i].id] = data[i];

            var rowClass = "realmListOddRow";

            // Make even numbered table rows a different colour.
            if (0 == (++row % 2)) rowClass = "realmListEvenRow";
            body += "<tr id='" + data[i]._id + "' class='" + rowClass + "'>";
            body += "<td>" + data[i].name + "</td>";
            body += "<td>" + data[i].description + "</td>";
            body += "<td>" + data[i].updatedAt.toLocaleString('en-GB') + "</td>";
            body += "<td><input type='button' class='editRealmDesign' value='Edit'/></td>";
            body += "<td><input type='button' class='deleteRealmDesign' value='Delete'/></td>";
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
                deleteRealmDesign($(this), db_collections);
                loadAndDisplayAvailableRealms();
            });

            $('.addToGame').on('click', function () {
                addToGame($(this));
            });
        }

        if (callback) {
            callback();
        }
    });
}


function loadGames(callback) {
    db_collections.games.find({}, function (err, data) {
        console.log("loadGames found data: " + JSON.stringify(data));

        var header = "<table class='realmList'>";
        header += "<tr><th class='realmListName'>Name</th>";
        header += "<th class='realmListDescription'>Description</th>";
        header += "<th>Create Date</th>";
        header += "<th>Edit</th>";
        header += "<th>Delete</th>";
        header += "<th>Action</th></tr>";

        var row = 0;
        var body = "";
        data.forEach(function(game) {
            var rowClass = "realmListOddRow";
            if (0 == (++row % 2)) rowClass = "realmListEvenRow";
            body += "<tr id='" + game.id + "' class='" + rowClass + "'>";
            body += "<td>" + game.name + "</td>";
            body += "<td>" + game.description + "</td>";
            body += "<td>" + game.updatedAt + "</td>";
            body += "<td><input type='button' class='editGame' value='Edit'/></td>";
            body += "<td><input type='button' class='deleteGame' value='Delete'/></td>";
            body += "<td><input type='button' class='createInstance' value='Create Instance'/></td>";
            body += "</tr>";
        });

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

            $('.createInstance').on('click', function () {
                // Store the id of the game you want to instantiate.
                // This will be needed later.
                var templateGameId = $(this).closest('tr').attr('id');
                $('#newInstanceTemplateGameId').val(templateGameId);
                $('#createGameInstancePanel').show();
            });
        }

        callback();
    });
}


// Load the details of the existing game instances from the server using the "/fetchGameInstances" API.
// See the comments on the loadRealmDesigns() function for a detailed function walkthrough.
function loadGameInstances(callback) {
    $.get(
        '/fetchGameInstances',
        function (data) {
            var header = "<table class='realmList'>";
            header += "<tr><th class='realmListName'>Name</th>";
            header += "<th class='realmListDescription'>Description</th>";
            header += "<th>Create Date</th>";
            header += "<th>Delete</th>";
            header += "<th>Play</th></tr>";

            var row = 0;
            var body = "";
            data.forEach(function(game) {
                var rowClass = "realmListOddRow";
                if (0 == (++row % 2)) rowClass = "realmListEvenRow";
                body += "<tr id='" + game.id + "' class='" + rowClass + "'>";
                body += "<td>" + game.name + "</td>";
                body += "<td>" + game.description + "</td>";
                body += "<td>" + game.updatedAt + "</td>";
                body += "<td><input type='button' class='deleteGameInstance' value='Delete'/></td>";
                body += "<td><input type='button' class='play' value='Play'/></td>";
                body += "</tr>";
            });

            $('#gameInstanceList').html("");
            $('.deleteGameInstance').off();
            $('.play').off();

            if (body.length > 0) {
                $('#gameInstanceList').html(header + body);

                $('.deleteGameInstance').on('click', function () {
                    deleteGame($(this));
                });

                $('.play').on('click', function () {
                    playGame($(this).closest('tr').attr('id'));
                });
            }

            if (callback) callback();
        }
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
        if (callback) callback("Failed to load games");
    });
}


function createGame() {
    var gameName = $('#gameName').val().trim();
    var gameDesc = $('#gameDescription').val().trim();

    $.post(
        '/createGame',
        {
            name: gameName,
            description: gameDesc
        },
        function (data) {
            cleanAndHideCreateGamePanel();
            $('#showCreateGameButton').show();
            loadGames();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        cleanAndHideCreateGamePanel();
        $('#showCreateGameButton').show();
        loadGames();
    });
}


// The "Edit" button was clicked on one of the Games table rows.
function editGame(target) {
    // Build a URL to invoke the game editor, passing the id of the row that
    // was clicked. The jQuery selector target.closest('tr') traverses the
    // parents of the element that was clicked until it finds one of type "<tr>".
    // "window.location =" will redirect the user to the new web page. In this case
    // the "/editGame" route (in config/routes.js) will render the questRealm/editGame
    // view instead of returning JSON data. This view will pass the realm data to
    // views/questRealm/editGame.ejs where it can be referenced using template parameters
    // when drawing the page.
    //window.location = "/editGame?id=" + target.closest('tr').attr('id');

    // Send an ipc command to the main window to tell it to load new html.
    console.log(__dirname);
    //ipc.send('load-page', 'file://' + __dirname + '..//.html');
}


// Clear any data that was typed into the "Create Realm" form so that it is
// blank the next time it is displayed.
function cleanAndHideCreateRealmPanel()
{
    // Select the panel using its 'id' attribute.
    var panel = $('#realmDesignContainer');
    panel.hide();
    // Find all the text fields on the panel and clear their contents.
    panel.find('input[type=text]').val('');
    panel.find('input[type=number]').val('');
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


// Clear any data that was typed into the "Create Game Instance" form so that it is
// blank the next time it is displayed.
function cleanAndHideCreateGameInstancePanel()
{
    // Select the panel using its 'id' attribute.
    var panel = $('#createGameInstancePanel');
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
    if (confirm("Are you sure you want to delete game " + name)) {
        $.post(
            '/deleteGame',
            {id: id},
            function (data) {
                loadGames();
                loadGameInstances();
            }
        ).fail(function(res){
            alert("Error: " + JSON.parse(res.responseText).error);
            loadGames();
            loadGameInstances();
        });
    }
}


function createGameInstance() {
    var templateGameId = $('#newInstanceTemplateGameId').val();
    var gameInstanceName = $('#gameInstanceName').val().trim();
    var playerName = $('#playerName').val().trim();

    $.post(
        '/createGameInstance',
        {
            templateGameId: templateGameId,
            name: gameInstanceName,
            playerName: playerName
        },
        function (data) {
            cleanAndHideCreateGameInstancePanel();
            loadGameInstances();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        cleanAndHideCreateGameInstancePanel();
        loadGameInstances();
    });
}


// The "Play" button was clicked on one of the Game table rows.
function playGame(target) {
    // Build a URL to invoke the game, passing the id of the row that
    // was clicked. The jQuery selector target.closest('tr') traverses the
    // parents of the element that was clicked until it finds one of type "<tr>".
    // "window.location =" will redirect the user to the new web page. In this case
    // the "/editRealm" route will render the questRealm/editRealm view instead of returning
    // JSON data. This view will pass the realm data to views/questRealm/editRealm.ejs
    // where it can be referenced using template parameters when drawing the page.
    window.location = "/playGame?id=" + target;
}
