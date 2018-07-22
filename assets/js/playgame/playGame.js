/**
 * Created by Simon on 28/05/16.
 * This file implements the interactions for the game UI.
 */

// Constants
describeDetailEnum = {
    TERRAIN_ONLY: 0,
    TERRAIN_AND_CONTENTS: 1
};

// Global data

// The game data. This will be retrieved initially and then kept updated
// via socket messages.
var gameData;
var currentRealmData;
var maplocationData;

// Socket management.
// If joining a multiplayer game that is already in progress, you may receive game update
// messages before you have finished processing the initial data-load operations. Set a busy
// flag so that these messages are queued for subsequent processing.
// This can be tested by calling the dummyCommand API as shown below.
var gamesocket;
var messageQueue = [];
var busy = true;

// Find a player.
class playerInfo {
    constructor(player, playerIndex) {
        this.player = player;
        this.playerIndex = playerIndex;
   }
}

class findPlayer {
    static findPlayerByName(game, playerName) {
        for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].name === playerName) {
                return new playerInfo(game.players[i], i);
            }
        }

		    return null;
    }
}

// When the page has finished rendering...
$(document).ready(function() {
    // Get the size of the map grid that should be drawn. These values come from the HTML elements
    // with id="realmWidth" and id="realmHeight".
    // The jQuery selectors $(#XXX) below select the elements by id.
    // The data was placed into these elements in the first place by the template parameters
    //    value="<%= realm.width %>"
    //    value="<%= realm.height %>"
    // which get their values from the data passed to the view function by editRealm() in
    // api/controllers/QuestRealmcontroller.js:
    //    return res.view("questRealm/editRealm", {
    //        realm: {
    //            id: realm.id,
    //            name: realm.name,
    //            width: realm.width,
    //            height: realm.height
    //       }
    var gameId = $('#gameId').val();

    // There's no point in having a backbone collection to only ever run "fetch" on it.
    // The client will fetch the data once at the start and then keep it in syn using the
    // socket messages.

    // Temporarily make it global for debug purposes.
    /*var*/ gamesocket = io.connect();
    gamesocket.on('connect', function socketConnected() {
        // Load the game and call the function below when it has been retrieved.
        // You need to use this callback approach because the AJAX call is
        // asynchronous. This means the code here won't wait for it to complete,
        // so you have to provide a function that can be called when the data is ready.
        loadGame(function() {
            $('#gameName').text("Play Game " + gameData.name);
            $('#playerName').text("Playing as " + gameData.players[0].name);

            loadMaplocations(function() {
                // Configure the map draw mode panel according to the user's preference.
                var mapDrawMode = gameData.players[0].mapDrawMode;
                $('#drawChoice_' + mapDrawMode).prop("checked", true)
                drawMapGrid(currentRealmData.width, currentRealmData.height, mapDrawMode);
                buildMessageArea();

                // Listen for socket messages from the server
                console.log("Lsitening for messages with subject: " + currentRealmData.id + "-status");
                gamesocket.on(currentRealmData.id + '-status', function messageReceived(message) {
                    messageQueue.push(message);
                    console.log("Push message onto queue: " + JSON.stringify(messageQueue));
                    if (busy) {
                        console.log("Busy, process message later");
                    } else {
                        console.log("Not busy, process message.");
                        processMessages();
                    }
                });

                busy = false;
                processMessages();
                var playerLocation = findPlayerLocation(maplocationData, gameData.players[0].name);
                displayMessageBlock(describeMyLocation(playerLocation));
            });
        });

        ///////////////////////////////////////////////////////////
        // Here's where you'll want to add any custom logic for
        // when the browser establishes its socket connection to
        // the Sails.js server.
        ///////////////////////////////////////////////////////////
        /*
        console.log(
            '22 Socket is now connected and globally accessible as `socket`.\n' +
            'e.g. to send a GET request to Sails, try \n' +
            '`socket.get("/", function (response) ' +
            '{ console.log(response); })`'
        );
        */
        ///////////////////////////////////////////////////////////

        // DEBUG
        /*
        {
            // Trigger a command that will send an AJAX reponse and immediately publish a few
            // socket messsages. Ensure that the client is busy and that the messages get
            // queued and are successfully processed later.
            console.log("starting dummycommand");
            $.get(
                '/dummyCommand',
                function (data) {
                    console.log("after dummycommand, starting delay.");
                    setTimeout(function(){
                        console.log("after delay");
                        busy = false;
                        processMessages();
                    }, 10000);
                }
            ).fail(function(res){
                alert("Error: " + JSON.parse(res.responseText).error);
            });
        }
        */
    });

    // Handle game commands
    $('#inputArea').keypress(function(event) {
        if (event.keyCode == 13) {
            var commandTextBox = $('#inputArea');
            var commandText = commandTextBox.val().trim();
            if (0 === commandText.length) {
                return;
            }

            var playerLocation = findPlayerLocation(maplocationData, $('#playerName').val());
            if (!playerLocation) {
                alert("Could not find player " + $('#playerName').val() + " on the map.");
                return;
            }

            displayMessage(commandText);
            handleCommand(playerLocation, commandText);
            commandTextBox.val("");
        }
    });

    // Show / edit map locations
    $(document).on('mouseenter', '#mapPanel', function() {});

    $(document).on('mouseleave', '#mapPanel', function() {});

    $('input[name=drawChoice]').on('change', function changeDrawMode(selectedOption) {
        console.log(selectedOption.target.value);
        gameData.players[0].mapDrawMode = selectedOption.target.value;
        saveGame();
        drawMapGrid(currentRealmData.width, currentRealmData.height, selectedOption.target.value);
        var playerLocation = findPlayerLocation(maplocationData, gameData.players[0].name);
        showPlayerLocation(playerLocation.y, playerLocation.x);
    })
});


//
// Utility functions
//

function processMessages() {
    console.log("======== starting processMessages() ========");
    if (busy) {
        console.log("busy. leaving processMessages()");
    }

    // debug
    /*
    for (var x = 0; x < messageQueue.length; x++) {
       console.log("message queue entry [" + x + "]: " + JSON.stringify(messageQueue[x]));
    }
    */

    while (messageQueue.length > 0) {
        var thisMessage = messageQueue.shift();
        console.log("processing message: " + JSON.stringify(thisMessage));

        if (thisMessage.description.action === "move") {
            processMoveNotification(thisMessage);
        }
        else if (thisMessage.description.action === "take" ||
                 thisMessage.description.action === "take from") {
            processTakeNotification(thisMessage);
        }
        else if (thisMessage.description.action === "buy" ||
                 thisMessage.description.action === "buy from") {
            processBuyNotification(thisMessage);
        }
        else if (thisMessage.description.action === "drop") {
            processDropNotification(thisMessage);
        }
        else if (thisMessage.description.action === "objective completed") {
            processObjectiveCompletedNotification(thisMessage);
        }
        else if (thisMessage.description.action === "give") {
            processGiveNotification(thisMessage);
        }
        else if (thisMessage.description.action === "use") {
            processUseNotification(thisMessage);
        }
        else if (thisMessage.description.action === "fight") {
            processFightNotification(thisMessage);
        }
    }
    console.log("======== finished processMessages() ========");
}

function processMoveNotification(message) {
    gameData = message.data.game[0];

    if (message.player === gameData.players[0].name) {
        console.log(message.description.message);
        displayMessageBlock(describeMyLocation(maplocationData[message.description.to.y-1][message.description.to.x-1]));

        var oldLocation = maplocationData[message.description.from.y-1][message.description.from.x-1];
        if (shouldDrawMapLocation(oldLocation)) {
            // Draw the old map location without the player.
            drawMaplocation(oldLocation);
        }

        var newLocation = maplocationData[message.description.to.y-1][message.description.to.x-1];
        if (shouldDrawMapLocation(newLocation)) {
            // Show the player in the new location.
            drawMaplocation(newLocation);
            showPlayerLocation(message.description.to.y, message.description.to.x);
        }
    }
}

function processTakeNotification(message) {
    gameData = message.data.game[0];
    mapLocation = message.data.location[0];
    maplocationData[parseInt(mapLocation.y)-1][parseInt(mapLocation.x)-1] = mapLocation;

    if (message.player === gameData.players[0].name) {
        console.log(message.description.message);
        displayMessageBlock(message.description.message);

        if (shouldDrawMapLocation(mapLocation)) {
            // Show the player in the new location.
            drawMaplocation(mapLocation);
            showPlayerLocation(mapLocation.y, mapLocation.x);
        }
    }
}

function processBuyNotification(message) {
    gameData = message.data.game[0];
    mapLocation = message.data.location[0];
    maplocationData[parseInt(mapLocation.y)-1][parseInt(mapLocation.x)-1] = mapLocation;

    if (message.player === gameData.players[0].name) {
        console.log(message.description.message);
        displayMessageBlock(message.description.message);

        if (shouldDrawMapLocation(mapLocation)) {
            // Show the player in the new location.
            drawMaplocation(mapLocation);
            showPlayerLocation(mapLocation.y, mapLocation.x);
        }
    }
}

function processDropNotification(message) {
    gameData = message.data.game[0];
    mapLocation = message.data.location[0];
    maplocationData[parseInt(mapLocation.y)-1][parseInt(mapLocation.x)-1] = mapLocation;

    if (message.player === gameData.players[0].name) {
        console.log(message.description.message);
        displayMessageBlock(message.description.message);

        if (shouldDrawMapLocation(mapLocation)) {
            // Show the player in the new location.
            drawMaplocation(mapLocation);
            showPlayerLocation(mapLocation.y, mapLocation.x);
        }
    }
}

function processGiveNotification(message) {
    gameData = message.data.game[0];
    mapLocation = message.data.location[0];
    maplocationData[parseInt(mapLocation.y)-1][parseInt(mapLocation.x)-1] = mapLocation;

    if (message.player === gameData.players[0].name) {
        console.log(message.description.message);
        displayMessageBlock(message.description.message);

        if (shouldDrawMapLocation(mapLocation)) {
            // Show the player in the new location.
            drawMaplocation(mapLocation);
            showPlayerLocation(mapLocation.y, mapLocation.x);
        }
    }
}

function processUseNotification(message) {
    gameData = message.data.game[0];

    if (message.player === gameData.players[0].name) {
        console.log(message.description.message);
        displayMessageBlock(message.description.message);
    }
}

function processFightNotification(message) {
    gameData = message.data.game[0];
    mapLocation = message.data.location[0];
    maplocationData[parseInt(mapLocation.y)-1][parseInt(mapLocation.x)-1] = mapLocation;

    if (message.player === gameData.players[0].name) {
        console.log(message.description.message);
        displayMessageBlock(message.description.message);

        if (shouldDrawMapLocation(mapLocation)) {
            // Show the player in the new location.
            drawMaplocation(mapLocation);
            showPlayerLocation(mapLocation.y, mapLocation.x);
        }
    }
}

function processObjectiveCompletedNotification(message) {
    currentRealmData = message.data.realm[0];
    var objective = message.data.objective;

    if (message.player === gameData.players[0].name) {
        var status = "You have completed an objective: " +
           buildObjectiveDescription(objective) + ".";

        console.log(status);
        displayMessage(status);

        for (var i=0; i<currentRealmData.objectives.length; i++) {
           if (currentRealmData.objectives[i].completed === "false") {
              displayMessage("");
              return;
           }
        }

        displayMessageBlock("All objectives are complete.");
    }
}

// Return a text descrption of an objective.
function buildObjectiveDescription(objective) {
   var desc = objective.type + " ";
   for (var i=0; i<objective.params.length; i++) {
      desc += objective.params[i].name;
      desc += ":";
      desc += objective.params[i].value;

      if (i < objective.params.length -1) {
         desc += ", ";
      }
   }

   return desc;
}

function loadGame(callback) {
    console.log(Date.now() + ' loadGame');

    $.get(
        '/fetchGame',
        { "id": $('#realmId').val() },
        function (data) {
            gameData = data;
            callback();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
}

function saveGame() {
    console.log(Date.now() + ' saveGame');

    $.post(
        '/saveGame',
        {gameData: gameData},
        function (data) {
            console.log(data);
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
}

function loadMaplocations(callback) {
    console.log(Date.now() + ' loadMaplocations');

    async.waterfall([
        function loadCurrentRealm(realmCallback) {
            $.get(
                '/questrealm?id=' + gameData.players[0].location.realmId,
                function (data) {
                   currentRealmData = data;
                   realmCallback(null, data);
                }
            ).fail(function(res){
                realmCallback("Error: " + JSON.parse(res.responseText).error);
            });
        },
        function loadMapLocations(realmData, maplocationCallback) {
            $.get(
                '/maplocation?realmId=' + realmData.id,
                function (data) {
                    // Make a sparse array for the map area.
                    maplocationData = new Array(parseInt(realmData.height));
                    $.each(data, function(index, item) {
                        console.log("iter: " + JSON.stringify(item));

                        if (maplocationData[parseInt(item.y)-1] === undefined) {
                            maplocationData[parseInt(item.y)-1] = new Array(parseInt(realmData.width));
                        }
                        maplocationData[parseInt(item.y)-1][parseInt(item.x)-1] = item;
                    });

                    maplocationCallback();
                }
            ).fail(function(res){
                maplocationCallback("Error: " + JSON.parse(res.responseText).error);
            });
        }
    ], function (err) {
        if (!err) {
           callback();
        }
    });
}

function drawMapGrid(realmWidth, realmHeight, mapDrawMode) {
    var mapTable = $('#mapTable');
    var tableContents = '';

    /* Draw the empty grid with axis labels.

       Being an html table, it has to be drawn from the top left to
       bottom right, but we want to label the cells with the origin
       at the bottom left.
    */

    // Allow an extra cell at the top and bottom of the table for the cell labels.
    realmWidth = parseInt(realmWidth);
    realmHeight = parseInt(realmHeight);

    for (var yCounter = realmHeight +1; yCounter >= 0; yCounter--) {
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<tr>';
        } else {
            tableContents += '<tr id="row_' + yCounter + '">';
        }

        // Allow an extra cell at the start of the row for the cell labels.
        tableContents += '<td style="border-style: none">';
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<div>&nbsp;</div>';
        } else {
            tableContents += '<div style="width:50px; height:50px; line-height:50px; text-align:center;">' + yCounter + '</div>';
        }
        tableContents += '</td>';

        // Draw the columns.
        for (var xCounter = 1; xCounter <= realmWidth; xCounter++) {
            // Draw the column labels in the top and bottom rows.
            if ((yCounter === 0) || (yCounter === realmHeight +1)) {
                tableContents += '<td style="border-style: none"><div style="width:50px; height:50px; line-height:50px; text-align:center;">' + xCounter + '</div></td>';
            } else {
                // Draw the regular map cells.
                tableContents += '<td id="cell_' + xCounter + "_" + yCounter + '"> ' +
                '<div class="droppable" style="width:50px; height:50px;" ' +
                'data-x="' + xCounter + '" data-y="' + yCounter + '" data-env=""></div>' +
                '</td>';
            }
        }

        // Allow an extra cell at the end of the row for the cell labels.
        tableContents += '<td style="border-style: none">';
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<div>&nbsp;</div>';
        } else {
            tableContents += '<div style="width:50px; height:50px; line-height:50px; text-align:center;">' + yCounter + '</div>';
        }
        tableContents += '</td>';

        tableContents += '</tr>';
    }
    mapTable.html(tableContents);

    // Now draw all the data initially.
    for (var y=0; y<realmHeight; y++) {
        var thisRow = maplocationData[y];
        if (thisRow !== undefined) {
            for (var x = 0; x < realmWidth; x++) {
                var location = thisRow[x];
                if (thisRow[x] !== undefined && shouldDrawMapLocation(location)) {
                    drawMaplocation(location);
                }
            }
        }
    }
}

function drawMaplocation(locationData) {
    var target = $('#mapTable td[id="cell_' + locationData.x + '_' + locationData.y + '"]').find('div');
    target.attr('data-id', locationData.id);
    target.addClass('terrainCell');
    var html = '';

    var playerName = $('#playerName').val();
    if (shouldDrawMapLocation(locationData)) {
        // Always show the terrain once the player has visited the location, as terrain never changes.
        target.attr('data-env', locationData.type);
        html += '<img src="images/' + locationData.type + '.png" style="position:absolute" />';

        // TODO: decide whether the maplocation's items and characters remain permanently visible, or
        // only visible when the player is in the location.
        // For now show the details if the player has visited the location.
        if (locationData.characters.length > 0) {
            html += '<img src="images/other-character-icon.png" style="position:absolute; margin-left: 1em">';
        }

        if (locationData.items.length > 0) {
            html += '<img src="images/object-icon.png" style="position:absolute; margin-left: 2em; margin-top: 1em">';
        }
    }

    target.html(html);
}

// Decide whether to show a maplocation depending on thr mapdraw mode.
function shouldDrawMapLocation(locationData) {
    var playerName = $('#playerName').val();

    // The list of locations the player has visited is a dictionary for
    // quick searching when drawing the map. Using a list
    // will scale badly when drawing the whole map.
    var visitedKey = locationData.x.toString() + "_" + locationData.y.toString();
    var playerVistitedLocation = (visitedKey in gameData.players[0].visited[locationData.realmId]);
    var mapDrawMode = gameData.players[0].mapDrawMode;
    if (("autoAll" == mapDrawMode) || ("autoVisited" == mapDrawMode && playerVistitedLocation)) {
        return true;
    }

    return false;
}

function showPlayerLocation(y, x) {
    var location = maplocationData[y-1][x-1];

    if (shouldDrawMapLocation(location)) {
        var target = $('#mapTable td[id="cell_' + x + '_' + y + '"]').find('div');
        var html = target.html();
        html += '<img src="images/player-icon.png" style="position:absolute">';
        target.html(html);
    }
}

function buildMessageArea() {
    var html = "";
    var numRows = 25;
    for (var row=0; row <numRows; row++) {
        html += "<tr><td><input class='messageRow' size='80' readonly /></td></tr>";
    }

    $('#messageTable').html(html);
}

function wordbreak(message) {
    var tmp = message.substring(0, 80);
    var lastSpace = tmp.lastIndexOf(" ");
    var lastColon = tmp.lastIndexOf(":");
    var lastPeriod = tmp.lastIndexOf(".");
    return message.substring(0, Math.max(lastSpace, lastColon, lastPeriod) +1);
}

// Display a message with a blank line underneath.
function displayMessageBlock(message) {
    displayMessage(message);
    displayMessage("");
}

// Display a message a briefly highlight it in the message table.
function displayMessage(message) {
    displayMessageImpl(message);
    setTimeout(function() { $('.messageRow.newMessage').removeClass('newMessage').addClass('oldMessage'); }, 1000);
}

function displayMessageImpl(message) {
    if (message.length > 80) {
        var msgFragment = wordbreak(message);
        displayMessageImpl(msgFragment);
        message = message.substring(msgFragment.length);
        while (message.length) {
            var msgFragment = wordbreak(message);
            displayMessageImpl(msgFragment);
            message = message.substring(msgFragment.length);
        }
    } else {
        var table = $('#messageTable');
        var topRow = table.find('tr:first');
        var bottomRowTextField = table.find('tr:last input');

        if (0 === bottomRowTextField.val().length) {
            bottomRowTextField.val(">\t" + message);
            bottomRowTextField.addClass('messageRow newMessage');
        } else {
            topRow.remove();
            table.append("<tr><td><input class='messageRow newMessage' size='80' readonly value='>\t" + message + "'/></td></tr>");
        }
    }
}

function findPlayerLocation(locations, playerName) {
    var playerLocation = null;

    $.each(gameData.players, function(index, player) {
        if (player.name === playerName) {
            var location = maplocationData[parseInt(player.location.y)-1][parseInt(player.location.x)-1];

            if (location !== undefined)
                playerLocation = location;

            return false;
        }
    });

    return playerLocation;
}

function describeLocationContents(location, detailLevel) {
    var message = "";

    if (detailLevel >= describeDetailEnum.TERRAIN_AND_CONTENTS) {
        // TODO: format the list better. Say "two dwarves" rather than "a dwarf and a dwarf".
        var numCharacters = location.characters.length;
        if (numCharacters > 0) {
            message += " There is a ";
            for (var i = 0; i < numCharacters; i++) {
                message += location.characters[i].type;
                if (i < numCharacters - 2) {
                    message += ", a ";
                } else if (i == numCharacters - 2) {
                    message += ", and a ";
                }
            }
            message += ". ";
        }

        var numItems = location.items.length;
        if (numItems > 0) {
            message += " There is a ";
            for (var i = 0; i < numItems; i++) {
                message += location.items[i].type;
                if (i < numItems - 2) {
                    message += ", a ";
                } else if (i == numItems - 2) {
                    message += ", and a ";
                }
            }
            message += ".";
        }
    }

    return message;
}

function describeLocation(location, detailLevel) {
    var message = "Terrain: " + location.type + ".";
    message += describeLocationContents(location, detailLevel);
    return message;
}

function describeMyLocation(location) {
    showPlayerLocation(location.y, location.x);
    var message = "You are at location [" + location.x + ", " + location.y + "]. Terrain: " + location.type + ".";
    message += describeLocationContents(location, describeDetailEnum.TERRAIN_AND_CONTENTS);
    return message;
}

function handleCommand(playerLocation, commandText) {
    var tokens = commandText.split(" ");

    // If the client has the data then certain commands can be fulfilled locally.
    if (tokens[0] === "help") {
        handleHelp(tokens);
        return;
    } else if (tokens[0] === "look") {
        handleLook(playerLocation, tokens);
        return;
    } else if (tokens[0] === "inventory") {
        handleInventory(playerLocation, tokens);
        return;
    } else if (tokens[0] === "status") {
        handleStatus(playerLocation, tokens);
        return;
    } else if (tokens[0] === "describe") {
        handleDescribe(playerLocation, tokens);
        return;
    }

    // This command can't be handled locally. Send to the server.
    $.post(
        '/gameCommand', {
            command: commandText,
            player: $('#playerName').val(),
            gameId: $('#realmId').val()
        },
        function (data) {
            console.log(data);
            if (data.error) {
                displayMessageBlock(escapeHtml(data.message));
                return;
            }

            // Some commands require client-side post-processing.
            /*
            if (tokens[0] === "status") {
                processSomeFunction(data);
            }
            */
        }
    ).fail(function (res) {
        alert("Error: " + res.responseJSON.error);
    });

    return;
}

function handleGenericHelp() {
    displayMessage("Commands:");
    displayMessage("   help : display list of commands.");
    displayMessage("   look [direction] : describe the adjacent location in the specified direction, or the current location " +
                       "if no direction specified.");
    displayMessage("   move direction : move in the specified direction, if possible.");
    displayMessage("   take item [from character] : take the named item. e.g. \"take short sword\" from the specified character, " +
                       "or from the current location.");
    displayMessage("   buy item from character : buy the named item from the specified character.    e.g. \"buy short sword from Giant\"." +
                       " Try to take the item first and the character will name the price, if it is willing to sell the item.");
    displayMessage("   drop item : drop the named item. e.g. \"drop short sword\".");
    displayMessage("   inventory : list the items in your inventory.");
    displayMessage("   describe (...) : describe character or item, Use \"help describe\" for more details.");
    displayMessage("   status : show health and game progress.");
    displayMessage("");
}

function handleHelpDescribe() {
    displayMessage("describe:");
    displayMessage("   describe [location] | [character type [number]] | [item type [number]] : describe the current location, " +
                   "or a character or item of the specified type. For example:");
    displayMessage("      describe dwarf : describe the first dwarf in the current location.");
    displayMessage("      describe short sword 2 : describe the second short sword in the current location.");
    displayMessage("      describe location : describe the current location and its surroundings.");
    displayMessage("");
}

function handleHelp(tokens) {
   if (tokens.length > 1 && tokens[1] === "describe") {
      return handleHelpDescribe();
   }

   handleGenericHelp();
}

function handleLook(playerLocation, tokens) {
    // "Look" without a direction refers to the current location.
    if (1 === tokens.length) {
        displayMessageBlock(describeMyLocation(playerLocation));
        return true;
    }
    else {
        var deltaX = 0;
        var deltaY = 0;

        switch(tokens[1]) {
            case "north":
                deltaY = 1;
                break;
            case "northeast":
                deltaX = 1;
                deltaY = 1;
                break;
            case "east":
                deltaX = 1;
                break;
            case "southeast":
                deltaX = 1;
                deltaY = -1;
                break;
            case "south":
                deltaY = -1;
                break;
            case "southwest":
                deltaX = -1;
                deltaY = -1;
                break;
            case "west":
                deltaX = -1;
                break;
            case "northwest":
                deltaX = -1;
                deltaY = 1;
                break;
            default:
                var errorMessage = "Unknown direction " + tokens[1];
                displayMessageBlock(errorMessage);
                return false;
        }

        // Does the requested location exist? First get the current player location.
        var originalX = parseInt(playerLocation.x);
        var originalY = parseInt(playerLocation.y);
        var newX = originalX + deltaX;
        var newY = originalY + deltaY;
        console.log("searching for location [" + newX + ", " + newY + "].");

        if (!locationExists(newY -1, newX -1)) {
            var errorMessage = "That direction is beyond the edge of the world.";
            displayMessageBlock(errorMessage);
            return false;
        }

        var newLocation = maplocationData[newY -1][newX -1];
        displayMessageBlock(describeLocation(newLocation, describeDetailEnum.TERRAIN_ONLY));
        return true;
    }
}

function handleDescribe(playerLocation, tokens) {

    if (1 === tokens.length) {
        displayMessageBlock("Describe what?");
        return false;
    }

    // The command is in the format
    // describe [location | item type | character type] with an optional number.
    // Chop off "describe"
    tokens.shift();

    if (tokens[0] === "location") {
       describeLocationAndSorroundings(playerLocation);
       return;
    }

    // Was a number specified?
    var objectNumber = 1;
    var objectName = null;
    if (tokens.length > 1) {
       var parseNumber = parseInt(tokens[tokens.length -1]);
       if (!isNaN(parseNumber)) {
          // Remove the number.
          tokens.splice(-1, 1);
          objectNumber = parseNumber;
       }
    }

    // Whatever is left is the object name
    objectName = tokens.join(" ");

    // We don't know whether it's an item or character, so try both.
    if (!describeLocationCharacter(playerLocation, objectName, objectNumber)) {
       if (!describeLocationItem(playerLocation, objectName, objectNumber)) {
          displayMessageBlock("There is no " + objectName + ".");
       }
    }
}

// Quite Similar to handleLook(). Can we share some code?
function describeLocationAndSorroundings(playerLocation) {

    displayMessage(describeMyLocation(playerLocation));

    var directions = ["north", "northeast", "east", "southeast",
                      "south", "southwest", "west", "northwest"];

    for (var i = 0; i < directions.length; i++) {
        var deltaX = 0;
        var deltaY = 0;

        switch(directions[i]) {
            case "north":
                deltaY = 1;
                break;
            case "northeast":
                deltaX = 1;
                deltaY = 1;
                break;
            case "east":
                deltaX = 1;
                break;
            case "southeast":
                deltaX = 1;
                deltaY = -1;
                break;
            case "south":
                deltaY = -1;
                break;
            case "southwest":
                deltaX = -1;
                deltaY = -1;
                break;
            case "west":
                deltaX = -1;
                break;
            case "northwest":
                deltaX = -1;
                deltaY = 1;
                break;
            default:
                var errorMessage = "Unknown direction " + tokens[1];
                displayMessage(errorMessage);
                return false;
        }

        // Does the requested location exist? First get the current player location.
        var originalX = parseInt(playerLocation.x);
        var originalY = parseInt(playerLocation.y);
        var newX = originalX + deltaX;
        var newY = originalY + deltaY;
        console.log("searching for location [" + newX + ", " + newY + "].");

        if (!locationExists(newY -1, newX -1)) {
            continue;
        }

        var newLocation = maplocationData[newY -1][newX -1];
        var message = "To the " + directions[i] + " - ";
        message += describeLocation(newLocation, describeDetailEnum.TERRAIN_ONLY);
        displayMessage(message);
    }

    displayMessage("");
}

function describeLocationCharacter(playerLocation, characterName, characterNumber) {
    var matchedIndex = null;
    for (var i = 0; i < playerLocation.characters.length; i++) {
        if (playerLocation.characters[i].type === characterName) {
            // Count down the matches. If we reached 0 then we've
            // matched the specified number of characters.
            characterNumber--;
            if (characterNumber > 0) {
                continue;
            }

            matchedIndex = i;
            break;
        }
    }

    if (matchedIndex ===  null) {
       return false;
    }

    var thisCharacter = playerLocation.characters[matchedIndex];
    var message = "A " + thisCharacter.type;
    if (thisCharacter.name) {
        message += " called \"" + thisCharacter.name + "\"";
    }
    displayMessage(message);

    if (thisCharacter.description) {
        displayMessage(thisCharacter.description);
    }

    if (thisCharacter.additionalInfo) {
       displayMessage(thisCharacter.additionalInfo);
    }

    if (thisCharacter.damage) {
        displayMessage("Damage: " + thisCharacter.damage);
    }

    if (thisCharacter.health) {
        displayMessage("Health: " + thisCharacter.health);
    }

    if (thisCharacter.drops) {
        if( Object.prototype.toString.call(thisCharacter.drops) === '[object Array]' ) {
            displayMessage("Drops: " + thisCharacter.drops.join(", "));
        } else {
            // If the drops[] array defined in the plugin module only contained a single
            // entry, it will have been converted to a string when the object was saved.
            displayMessage("Drops: " + thisCharacter.drops);
        }
    }

    if (thisCharacter.inventory !== undefined &&
        thisCharacter.inventory.length > 0) {
        displayMessage("Inventory:");
        for (var j = 0; j < thisCharacter.inventory.length; j++) {
            // TODO: improve this to share the implementation with
            // describeLocationItem().
            displayMessage("  " + describeItem(thisCharacter.inventory[j]));
        }
    }

    return true;
}

function describeLocationItem(playerLocation, itemName, itemNumber) {
    var matchedIndex = null;
    for (var i = 0; i < playerLocation.items.length; i++) {
        if (playerLocation.items[i].type === itemName) {
            // Count down the matches. If we reached 0 then we've
            // matched the specified number of characters.
            itemNumber--;
            if (itemNumber > 0) {
                continue;
            }

            matchedIndex = i;
            break;
        }
    }

    if (matchedIndex ===  null) {
       return false;
    }

    var thisItem = playerLocation.items[matchedIndex];
    var message = "A " + thisItem.type;
    if (thisItem.name) {
        message += " called \"" + thisItem.name + "\"";
    }
    displayMessage(message);

    if (thisItem.description) {
        displayMessage(thisItem.description);
    }

    if (thisItem.damage) {
        displayMessage("Damage: " + thisItem.damage);
    }

    return true;
}

// TODO: improve this to share the implementation between
// describeLocationCharacter() and describeLocationItem().
function describeItem(item) {
    var message = "A " + item.type;
    if (item.name) {
        message += " called \"" + item.name + "\"";
    }

    if (item.description) {
        message += ". " + item.description + ".";
    }

    if (item.damage) {
        message += ". Damage: " + item.damage;
    }

    return message;
}

function locationExists(y, x) {
    if (maplocationData[y] === undefined)
        return false;

    if (maplocationData[y][x] === undefined)
        return false;

    return true;
}

function handleInventory(playerLocation, tokens) {
    // For now the assumption is that you are playing as gameData.players[0].
    // This will not be true when we support multi-player mode.
    var inventory = gameData.players[0].inventory;
    if (undefined !== inventory && 0 != inventory.length) {
        var message = "You have ";
        $.each(inventory, function (index, item) {
            message += item.type;
            if (item.name) {
                message = message + " (" + item.name + ")";
            }
            message += ", ";
        });
        displayMessageBlock(message.substring(0, message.lastIndexOf(", ")));
    }
    else {
        displayMessageBlock("There are no items in your inventory.");
    }
}

function handleStatus(playerLocation, tokens) {
    // For now the assumption is that you are playing as gameData.players[0].
    // This will not be true when we support multi-player mode.

    var playerInfo = findPlayer.findPlayerByName(gameData, gameData.players[0].name);
    if (null === playerInfo) {
        console.log("in handleUse.find() invalid player.");
		    return;
    }

    displayMessage("Health: " + playerInfo.player.health);
    displayMessage("Damage: " + playerInfo.player.damage);

    if (playerInfo.player.using !== undefined) {
        displayMessage("Using: " + playerInfo.player.using.type);
    }

    var allComplete = true;
    if (currentRealmData.objectives.length > 0) {
        displayMessage("Objective progress:");
        for (var i=0; i<currentRealmData.objectives.length; i++) {
            // Special handling for the "Start at" objective. It is automatically completed.
            if (currentRealmData.objectives[i].type === "Start at") {
               continue;
            }

            if (currentRealmData.objectives[i].completed === "false") {
                allComplete = false;
            }

            displayMessage("&nbsp;&nbsp;" +
                           buildObjectiveDescription(currentRealmData.objectives[i]) + ": " +
                           (currentRealmData.objectives[i].completed === "true" ? "complete" : "not complete"));
        }

        if (allComplete) {
            displayMessage("All objectives are complete.");
        }
    }

    displayMessage("");
}

// escapeHtml implementation taken from mustache.js
// https://github.com/janl/mustache.js/blob/eae8aa3ba9396bd994f2d5bbe3b9fc14d702a7c2/mustache.js#L60
var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}
