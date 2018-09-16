/**
 * Created by Simon on 09/08/17.
 * This file implements the interactions for the game editor page.
 * (c) Simon Logan
 */

var gameData;
var availableRealms = {};

TableDisplayMode = {
    SHOW_WHEN_EMPTY : 0,
    HIDE_WHEN_EMPTY : 1
}

// When the page has finished rendering...
$(document).ready(function() {
   // Get the id of the realm we're editing so that we can look it up with AJAX.
   // This value comes from the HTML element with id="realmId".
   // The jQuery selectors $(#XXX) below select the elements by id.
   // The data was placed into this element in the first place by the template parameter
   //    value="<%= realm.id %>"
   // which gets its value from the data passed to the view function by editRealm() in
   // api/controllers/QuestRealmcontroller.js:
   //    return res.view("questRealm/editRealm", {
   //        realm: {
   //            id: realm.id
   //       }
   var gameId = $('#gameId').val();

   // Load the game and avaialble relams and call the functions below when they have been
   // retrieved. You need to use this callback approach because the AJAX calls are
   // asynchronous. This means the code here won't wait for them to complete,
   // so you have to provide a function that can be called when the data is ready.
   async.parallel([
       function(callback) {
          loadAndDisplayAvailableRealms(callback);
       },
       function(callback) {
          loadAndDisplayGame(callback);
       },
   ],
   function(err, results) {
      if (!err) enableControls();
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
        createRealmDesign();
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
        var realmId = gameData.realms[i].templateRealmId;
        var rowClass = "realmListOddRow";
        if (0 == (++row % 2)) rowClass = "realmListEvenRow";

        // For now this table only displays the realm name and description, and we only
        // need to be able to add and remove realms from the game table. No need to store
        // any further details of the realm in this table.
        // data-templateRealmId links to id on the available realms table, so we can
        // check if the row already exists in the game table.
        body += "<tr data-templateRealmId='" + realmId + "' class='" + rowClass + "'>";
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


function loadAndDisplayGame(callback)
{
    console.log(Date.now() + ' loadAndDisplayGame');

    $.get(
        '/fetchGame',
        { "id": $('#gameId').val() },
        function (data) {
            gameData = data;
            displayGameDetails(TableDisplayMode.HIDE_WHEN_EMPTY);

            // Let the caller know we're finished.
            callback();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
        callback("Failed to load games");
    });
}


// Load the details of the existing realms from the server using the "/fetchRealms" API.
// This URL is mapped to a controller on the server using a route in config/routes.js which tells
// sails that a call to "/fetchRealms" should call the fetchRealms() function in QuestRealmController.js:
//    '/fetchRealms' : {
//        controller: 'questRealm',
//            action: 'fetchRealms'
//    }
function loadAndDisplayAvailableRealms(callback) {
    // Use jQuery to send an AJAX GET request to the server.
    $.get(
        // using the URL
        '/fetchRealms',
        // and when the server has a result it should call this function and pass the result
        // in the "data" parameter.
        function (data) {
            // Create the body of the "Realm Designs" table.
            var header = "<table class='realmList'>";
            header += "<tr><th class='realmListName'>Name</th>";
            header += "<th class='realmListDescription'>Description</th>";
            header += "<th>Create Date</th>";
            header += "<th>Edit</th>";
            header += "<th>Delete</th>";
            header += "<th>Add to Game</th>";

            // Removae any existing "add" button click handlers.
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
                body += "<tr id='" + data[i].id + "' class='" + rowClass + "'>";
                body += "<td>" + data[i].name + "</td>";
                body += "<td>" + data[i].description + "</td>";
                body += "<td>" + data[i].updatedAt + "</td>";
                body += "<td><input type='button' class='editRealmDesign' value='Edit'/></td>";
                body += "<td><input type='button' class='deleteRealmDesign' value='Delete'/></td>";
                body += "<td align='center'><input type='button' class='addToGame' value='Add'/></td>";
                body += "</tr>";
            };

            if (body.length === 0) {
                $('#availableRealmsList').html("");
                $('#realmDesignsPanel').hide();
            } else {
                // A jQuery selector $('#XXX') selects an HTML element using its 'id' attribute.
                $('#availableRealmsList').html(header + body);
                $('#realmDesignsPanel').show();

                // Now add the new handler functions for the buttons on the new table rows.
                $('.editRealmDesign').on('click', function () {
                    editRealmDesign($(this));
                });

                $('.deleteRealmDesign').on('click', function () {
                    deleteRealmDesign($(this));
                });

                $('.addToGame').on('click', function () {
                    addToGame($(this));
                });
            }

            if (callback) callback();
        }
    // If the AJAX call fails it should call this function.
    ).fail(function(res){
        alert("Error: " + res.getResponseHeader("error"));
        if (callback) callback("Failed to load realms");
    });
}


function addToGame(target) {
    console.log("Add to game");
    var gameId = $('#gameId').val();
    var templateRealmId = target.closest("tr").attr('id');

    if ($('#gameRealmsList tr[data-templateRealmId=' + templateRealmId + ']').length === 1) {
       // The realm is already in the game.
       return;
    }

    // Check the realm to ensure it is valid for adding to the game.
    // If not, disable the button so the check doesn't have to be repeated.
    $.post(
        '/checkRealm',
        { id: templateRealmId },
        function (data) {
            if (data.hasOwnProperty('error')) {
               target.prop('disabled', true);
               target.attr('title', data.error);
               alert(data.error);
               return;
            }

            gameData.realms.push({templateRealmId: templateRealmId});
            $('#saveContainer').show();
            displayGameDetails();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
}


function removeFromGame(target) {
    console.log("Remove from game");
    var gameId = $('#gameId').val();
    var templateRealmId = target.closest("tr").attr('data-templateRealmId');

    if ($('#gameRealmsList tr[data-templateRealmId=' + templateRealmId + ']').length === 0) {
       // The realm is not in the game.
       return;
    }

    for (var i = 0; i < gameData.realms.length; i++) {
       if (gameData.realms[i].templateRealmId === templateRealmId) {
           gameData.realms.splice(i, 1);
           $('#saveContainer').show();
           break;
       }
    }

    displayGameDetails(TableDisplayMode.SHOW_WHEN_EMPTY);
}


function moveRealmUp(target) {
    console.log("Move realm up");
    var gameId = $('#gameId').val();
    var templateRealmId = target.closest("tr").attr('data-templateRealmId');

    if ($('#gameRealmsList tr[data-templateRealmId=' + templateRealmId + ']').length === 0) {
       // The realm is not in the game.
       return;
    }

    // If we're moving an item up, start searching at the 2nd position.
    for (var i = 1; i < gameData.realms.length; i++) {
       if (gameData.realms[i].templateRealmId === templateRealmId) {
           var temp = gameData.realms[i - 1];
           gameData.realms[i - 1] = gameData.realms[i];
           gameData.realms[i] = temp;
           $('#saveContainer').show();
           break;
       }
    }

    displayGameDetails();
}


function moveRealmDown(target) {
    console.log("Move realm down");
    var gameId = $('#gameId').val();
    var templateRealmId = target.closest("tr").attr('data-templateRealmId');

    if ($('#gameRealmsList tr[data-templateRealmId=' + templateRealmId + ']').length === 0) {
       // The realm is not in the game.
       return;
    }

    // If we're moving an item down, stop searching one position before the end.
    for (var i = 0; i < gameData.realms.length - 1; i++) {
       if (gameData.realms[i].templateRealmId === templateRealmId) {
           var temp = gameData.realms[i + 1];
           gameData.realms[i + 1] = gameData.realms[i];
           gameData.realms[i] = temp;
           $('#saveContainer').show();
           break;
       }
    }

    displayGameDetails();
}


function updateGameRealms(target) {
    console.log("updateGameRealms");
    var gameId = $('#gameId').val();

    $.post(
        '/updateGameRealms',
        {
            gameId: gameId,
            realms: gameData.realms
        },
        function (data) {
            $('#saveContainer').hide();
            gameData = data;
            displayGameDetails(TableDisplayMode.HIDE_WHEN_EMPTY);
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
}

