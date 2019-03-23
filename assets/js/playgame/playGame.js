/**
 * Created by Simon on 28/05/2016.
 * This file implements the interactions for the game UI.
 * (c) Simon Logan
 */

// Global data
window.$ = window.jQuery = require('jquery');
const electron = require('electron');
const ipc = require('electron').ipcRenderer;
const Backbone = require('backbone');
var path = require('path');
var pluginsPath = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
const gameEngine = require(path.join(__dirname, '../../assets/js/backend/gameEngine.js'));

// Constants
describeDetailEnum = {
    TERRAIN_ONLY: 0,
    TERRAIN_AND_CONTENTS: 1
};

// The game data. This will be retrieved initially and then kept updated
// via socket messages. The "g_" prefix is to prevent accidental assignment
// in a function.
var g_gameData;
var g_currentRealmData;

// Backbone is a Model-View-Controller (MVC) framework. Extend the
// default Model with additional attributes that we need.
var MapLocation = Backbone.Model.extend({});

// Maintain a local collection of map locations. This will be synchronized (both ways)
// with the server and so allows multi-user access to the data.
var MapLocationCollection = Backbone.Collection.extend({
    // Extend the default collection with functionality that we need.
    model: MapLocation,
    sync: function () {
        ipc.send('logmsg', 'MapLocationCollection.sync()');

        // Filter out all the Backbone.Model fields. We just want to
        // save the raw data.
        g_currentRealmData.mapLocations = this.models.map(thisModel => thisModel.attributes);
        saveRealm(function () {
            ipc.send('logmsg', 'realm saved()');
        });
    }
});

// The maplocations from the current realm will be loaded into a
// backbone collection so the associated view can be automatically updated.
var g_locationData = new MapLocationCollection();

var mView;

var LocationsView = Backbone.View.extend({
    initialize: function () {
        this.listenTo(this.collection, 'reset', this.reset);
        this.listenTo(this.collection, 'add', this.add);
        this.listenTo(this.collection, 'remove', this.remove);
        this.listenTo(this.collection, 'change', this.change);
    },
    reset: function (data) {
        console.log("in view.reset:  " + JSON.stringify(data));
        data.forEach(function (item) {
            drawMapLocation(item);
        });

        buildMessageArea();
        var player = g_gameData.player;
        $('#playing_as').text("Playing as " + player.name);
        var playerLocation = findLocation(player.location.x, player.location.y);
        displayMessageBlock(describeMyLocation(playerLocation));
    },
    add: function (location) {
        if (location != undefined) {
            console.log("in view.add:  " + JSON.stringify(location));
            drawMapLocation(item);
        }
    },
    remove: function (location) {
        console.log("in view.remove: " + JSON.stringify(location));
        if (location != undefined) {
            console.log("in view.remove:  " + JSON.stringify(location));
            drawMapLocation(location);
        }
    },
    change: function (location) {
        console.log("in view.change:  " + JSON.stringify(location));
        if (location != undefined) {
            console.log("in view.change:  " + JSON.stringify(location));
            drawMapLocation(location);
        }
    }
});


// Find a player.
class playerInfo {
    constructor(player, playerIndex) {
        this.player = player;
        this.playerIndex = playerIndex;
    }
}

class findPlayer {
    static findPlayerByName(game, playerName) {
        // If we allow more than oneplayer in future:
        /*
        for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].name === playerName) {
                return new playerInfo(game.players[i], i);
            }
        }
        */

        // For now there is only a single player.
        if (game.player.name === playerName) {
            return new playerInfo(game.player, 0);
        }

        return null;
    }
}

// Called when the realm editor is loaded.
ipc.on('playGame-data', function (event, data) {
    $('#page_title').text("Play Game " + data.name);

    const app = electron.remote.app;
    var gameBasedir = path.join(app.getPath('userData'), "games");
    var dbPath = path.join(gameBasedir, data.name);

    // Load details of the game.
    console.log("********** starting playGame-data " + JSON.stringify(data) + " (" + Date.now() + ") **********");
    ipc.send('logmsg', "********** starting playGame-data " + JSON.stringify(data) + " (" + Date.now() + ") **********");

    gameEngine.initialize(dbPath, function (err) {
        if (err) {
            alert("Failed to load game: " + err);
            return;
        }

        g_gameData = gameEngine.getGameData();
        $('#page_title').text("Play Game " + g_gameData.name);
        $('#playing_as').text("Playing as " + g_gameData.player.name);
        switch (g_gameData.player.mapDrawMode) {
            case mapDrawModeEnum.AUTO_ALL:
                $('#drawChoice_autoAll').prop('checked', true);
                //$('input[name="drawChoice"][value="drawChoice_autoAll"]').prop('checked', true);
                break;
            case mapDrawModeEnum.AUTO_VISITED:
                $('#drawChoice_autoVisited').prop('checked', true);
                break;
            case mapDrawModeEnum.MANUAL:
                $('#drawChoice_manual').prop('checked', true);
                break;
            default:
                $('#drawChoice_autoAll').prop('checked', true);
                console.error("Unexpected draw choice value. Assuming auto_all");
        }

        g_currentRealmData = gameEngine.getCurrentRealmData();
        //$('#realmName').text("Editing realm " + g_currentRealmData.name);

        drawMapGrid(g_currentRealmData.width, g_currentRealmData.height);
        mView = new LocationsView({ collection: g_locationData });
        if (g_currentRealmData.hasOwnProperty('mapLocations')) {
            g_locationData.reset(g_currentRealmData.mapLocations);
        }

        displayObjectives();
    });

    // Handle game commands
    $('#inputArea').keypress(function (event) {
        if (event.keyCode == 13) {
            var commandTextBox = $('#inputArea');
            var commandText = commandTextBox.val().trim();
            if (0 === commandText.length) {
                return;
            }

            var playerLocation = findPlayerLocation();
            if (!playerLocation) {
                var playerName = g_gameData.player.name;
                alert(`Could not find player ${playerName} on the map.`);
                return;
            }

            displayMessage(commandText);
            handleCommand(playerLocation, commandText, function (result) {
                // Asynchronous result notifications from the game engine.
                // There could be multiple results returned, for example
                // completing an action and completing a goal as a result
                // of the action.
                processMessage(result);
            });
            commandTextBox.val("");
        }
    });

    // Show / edit map locations
    $(document).on('mouseenter', '#mapPanel', function () { });

    $(document).on('mouseleave', '#mapPanel', function () { });

    $('input[name=drawChoice]').on('change', function changeDrawMode(selectedOption) {
        console.log(selectedOption.target.value);
        g_gameData.player.mapDrawMode = selectedOption.target.value;
        saveGame();
        drawMapGrid(g_currentRealmData.width, g_currentRealmData.height, selectedOption.target.value);
        var playerLocation = findPlayerLocation();
        showPlayerLocation(playerLocation.y, playerLocation.x);
    });
}); // ipc.on('playGame-data')

//
// Utility functions
//

function processMessage(thisMessage) {
    console.log("======== starting processMessage() ========");
    console.log("processing message: " + JSON.stringify(thisMessage));

    if (thisMessage.error) {
        displayMessage(thisMessage.message);
        return;
    }

    if (thisMessage.responseData.description.action === "move") {
        processMoveNotification(thisMessage);
    }
    else if (thisMessage.responseData.description.action === "take" ||
        thisMessage.responseData.description.action === "take from") {
        processTakeNotification(thisMessage);
    }
    else if (thisMessage.responseData.description.action === "buy" ||
        thisMessage.responseData.description.action === "buy from") {
        processBuyNotification(thisMessage);
    }
    else if (thisMessage.responseData.description.action === "drop") {
        processDropNotification(thisMessage);
    }
    else if (thisMessage.responseData.description.action === "objective completed") {
        processObjectiveCompletedNotification(thisMessage);
    }
    else if (thisMessage.responseData.description.action === "give") {
        processGiveNotification(thisMessage);
    }
    else if (thisMessage.responseData.description.action === "use") {
        processUseNotification(thisMessage);
    }
    else if (thisMessage.responseData.description.action === "fight") {
        processFightNotification(thisMessage);
    }

    console.log("======== finished processMessage() ========");
}

function processMoveNotification(message) {
    var responseData = message.responseData;
    g_gameData = responseData.data.game;

    if (responseData.player === g_gameData.player.name) {
        console.log(responseData.description.message);
        var newLocation = findLocation(
            responseData.description.to.x.toString(),
            responseData.description.to.y.toString());
        displayMessageBlock(describeMyLocation(newLocation));

        var oldLocation = findLocation(
            responseData.description.from.x.toString(),
            responseData.description.from.y.toString());

        // Draw the old map location without the player.
        drawMapLocation(oldLocation);

        // Show the player in the new location.
        showPlayerLocation(newLocation);
    }
}

function processTakeNotification(message) {
    var responseData = message.responseData;
    g_gameData = responseData.data.game;
    var locationData = responseData.data.mapLocation;

    if (responseData.player === g_gameData.player.name) {
        console.log(responseData.description.message);
        displayMessageBlock(responseData.description.message);

        var mapLocation = findLocation(
            locationData.x.toString(),
            locationData.y.toString());

        if (!mapLocation) {
            alert("Unable to find the updated location");
            return;
        }

        // Update the corresponding model in the maplocation collection.
        // The view will automatically render the new data.
        mapLocation.set(locationData);

        // Show the player if we updated the current location.
        // The g_locationData update will not show the player location
        // as that is not part of the collection.
        if (locationData.x == g_gameData.player.location.x &&
            locationData.y == g_gameData.player.location.y) {
            showPlayerLocation(mapLocation);
        }
    }
}

function processBuyNotification(message) {
    var responseData = message.responseData;
    g_gameData = responseData.data.game;
    var locationData = responseData.data.mapLocation;

    if (responseData.player === g_gameData.player.name) {
        console.log(responseData.description.message);
        displayMessageBlock(responseData.description.message);

        var mapLocation = findLocation(
            locationData.x.toString(),
            locationData.y.toString());

        if (!mapLocation) {
            alert("Unable to find the updated location");
            return;
        }

        // Update the corresponding model in the maplocation collection.
        // The view will automatically render the new data.
        mapLocation.set(locationData);

        // Show the player if we updated the current location.
        // The g_locationData update will not show the player location
        // as that is not part of the collection.
        if (locationData.x == g_gameData.player.location.x &&
            locationData.y == g_gameData.player.location.y) {
            showPlayerLocation(mapLocation);
        }
    }
}

function processDropNotification(message) {
    var responseData = message.responseData;
    g_gameData = responseData.data.game;
    var locationData = responseData.data.mapLocation;

    if (responseData.player === g_gameData.player.name) {
        console.log(responseData.description.message);
        displayMessageBlock(responseData.description.message);

        var mapLocation = findLocation(
            locationData.x.toString(),
            locationData.y.toString());

        if (!mapLocation) {
            alert("Unable to find the updated location");
            return;
        }

        // Update the corresponding model in the maplocation collection.
        // The view will automatically render the new data.
        mapLocation.set(locationData);

        // Show the player if we updated the current location.
        // The g_locationData update will not show the player location
        // as that is not part of the collection.
        if (locationData.x == g_gameData.player.location.x &&
            locationData.y == g_gameData.player.location.y) {
            showPlayerLocation(mapLocation);
        }
    }
}

function processGiveNotification(message) {
    var responseData = message.responseData;
    g_gameData = responseData.data.game;

    if (responseData.player === g_gameData.player.name) {
        console.log(responseData.description.message);
        displayMessageBlock(responseData.description.message);
    }
}

function processUseNotification(message) {
    var responseData = message.responseData;
    g_gameData = responseData.data.game;

    if (responseData.player === g_gameData.player.name) {
        console.log(responseData.description.message);
        displayMessageBlock(responseData.description.message);
    }
}

function processFightNotification(message) {
    var responseData = message.responseData;
    g_gameData = responseData.data.game;
    var locationData = responseData.data.mapLocation;

    if (responseData.player === g_gameData.player.name) {
        console.log(responseData.description.message);
        displayMessageBlock(responseData.description.message);

        var mapLocation = findLocation(
            locationData.x.toString(),
            locationData.y.toString());

        if (!mapLocation) {
            alert("Unable to find the updated location");
            return;
        }

        // Update the corresponding model in the maplocation collection.
        // The view will automatically render the new data.
        mapLocation.set(locationData);

        // Show the player if we updated the current location.
        // The g_locationData update will not show the player location
        // as that is not part of the collection.
        if (locationData.x == g_gameData.player.location.x &&
            locationData.y == g_gameData.player.location.y) {
            showPlayerLocation(mapLocation);
        }
    }
}

function processObjectiveCompletedNotification(message) {
    g_currentRealmData = message.data.realm[0];
    var objective = message.data.objective;

    if (message.player === g_gameData.players[0].name) {
        var status = "You have completed an objective: " +
            buildObjectiveDescription(objective) + ".";

        console.log(status);
        displayMessage(status);

        for (var i = 0; i < g_currentRealmData.objectives.length; i++) {
            if (g_currentRealmData.objectives[i].completed === "false") {
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
    for (var i = 0; i < objective.params.length; i++) {
        desc += objective.params[i].name;
        desc += ":";
        desc += objective.params[i].value;

        if (i < objective.params.length - 1) {
            desc += ", ";
        }
    }

    return desc;
}

function displayObjectiveDetails(item) {
    var description = "";

    $.each(item.params, function (thisParam) {
        description += item.params[thisParam].name + ":" + item.params[thisParam].value + ", ";
    });

    description = description.substr(0, description.lastIndexOf(", "));
    return description;
}

function displayObjectives() {
    console.log(Date.now() + ' displayObjectives');
    var target = $('#objectiveList').html("");
    var html = "";

    var i = 0;
    if (g_currentRealmData.hasOwnProperty('objectives')) {
        g_currentRealmData.objectives.forEach(function (item) {
            html += "<tr data-id='" + (i++) + "'>";
            html += "<td class='objectiveName' data-value='" + item.type + "'>" + item.type + "</td>";
            html += "<td class='objectiveDetails'>" + displayObjectiveDetails(item) + "</td>";
            html += "<td><input class='deleteObjective' type='image' src='../../assets/images/wastebasket.png' alt='Delete' width='14' height='14'></td>";
            html += "</tr>";
        });
    }

    target.append(html);
}


function saveGame(callback) {
    console.log(Date.now() + ' saveGame');

    var db_collections = dbWrapper.getDBs();
    db_collections.game.update({ _id: g_gameData._id }, g_gameData, {}, function (err, numReplaced) {
        console.log("saveGame err:" + err);
        console.log("saveGame numReplaced:" + numReplaced);
        if (callback) {
            callback(null);
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

    for (var yCounter = realmHeight + 1; yCounter >= 0; yCounter--) {
        if ((yCounter === realmHeight + 1) || (yCounter === 0)) {
            tableContents += '<tr>';
        } else {
            tableContents += '<tr id="row_' + yCounter + '">';
        }

        // Allow an extra cell at the start of the row for the cell labels.
        tableContents += '<td style="border-style: none">';
        if ((yCounter === realmHeight + 1) || (yCounter === 0)) {
            tableContents += '<div>&nbsp;</div>';
        } else {
            tableContents += '<div style="width:50px; height:50px; line-height:50px; text-align:center;">' + yCounter + '</div>';
        }
        tableContents += '</td>';

        // Draw the columns.
        for (var xCounter = 1; xCounter <= realmWidth; xCounter++) {
            // Draw the column labels in the top and bottom rows.
            if ((yCounter === 0) || (yCounter === realmHeight + 1)) {
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
        if ((yCounter === realmHeight + 1) || (yCounter === 0)) {
            tableContents += '<div>&nbsp;</div>';
        } else {
            tableContents += '<div style="width:50px; height:50px; line-height:50px; text-align:center;">' + yCounter + '</div>';
        }
        tableContents += '</td>';

        tableContents += '</tr>';
    }
    mapTable.html(tableContents);
}

function drawMapLocation(locationData) {
    if (shouldDrawMapLocation(locationData)) {
        // Always show the terrain once the player has visited the location, as terrain never changes.
        var target = $('#mapTable td[id="cell_' + locationData.attributes.x + '_' + locationData.attributes.y + '"]').find('div');
        target.addClass('terrainCell');
        var html = '';

        target.attr('data-env', locationData.attributes.type);
        target.attr('data-id', locationData.id);
        target.attr('data-module', locationData.attributes.module);
        target.html('');
        target.append("<img src='" + pluginsPath + locationData.attributes.module + "/images/" + locationData.attributes.type + ".png'/>");

        // TODO: decide whether the maplocation's items and characters remain permanently visible, or
        // only visible when the player is in the location.
        // For now show the details if the player has visited the location.
        if (locationData.attributes.characters.length > 0) {
            target.append('<img src="../../assets/images/other-character-icon.png" class="characterIcon">');
        }

        if (locationData.attributes.items.length > 0) {
            target.append('<img src="../../assets/images/object-icon.png" class="itemIcon">');
        }

        var dummy = 5;
    }
}




// Decide whether to show a maplocation depending on thr mapdraw mode.
function shouldDrawMapLocation(locationData) {
    var player = g_gameData.player;

    // Default to always draw.
    if (!player.hasOwnProperty("mapDrawMode") || player.mapDrawMode === mapDrawModeEnum.AUTO_ALL) {
        return true;
    }

    // The list of locations the player has visited is a dictionary for
    // quick searching when drawing the map. Using a list
    // will scale badly when drawing the whole map.
    var visitedKey = locationData.x.toString() + "_" + locationData.y.toString();
    var playerVistitedLocation = (visitedKey in g_gameData.player.visited[locationData.realmId]);
    var mapDrawMode = g_gameData.player.mapDrawMode;
    if (("autoAll" == mapDrawMode) || ("autoVisited" == mapDrawMode && playerVistitedLocation)) {
        return true;
    }

    return false;
}

function showPlayerLocation(location) {
    if (shouldDrawMapLocation(location)) {
        var target = $('#mapTable td[id="cell_' + location.attributes.x + '_' + location.attributes.y + '"]').find('div');
        var html = target.html();
        html += '<img id="simon" src="../../assets/images/player-icon.png" class="playerIcon">';
        target.html(html);
    }
}

function buildMessageArea() {
    var html = "";
    var numRows = 25;
    for (var row = 0; row < numRows; row++) {
        html += "<tr><td><input class='messageRow' size='80' readonly /></td></tr>";
    }

    $('#messageTable').html(html);
}

function wordbreak(message) {
    var tmp = message.substring(0, 80);
    var lastSpace = tmp.lastIndexOf(" ");
    var lastColon = tmp.lastIndexOf(":");
    var lastPeriod = tmp.lastIndexOf(".");
    return message.substring(0, Math.max(lastSpace, lastColon, lastPeriod) + 1);
}

// Display a message with a blank line underneath.
function displayMessageBlock(message) {
    displayMessage(message);
    displayMessage("");
}

// Display a message a briefly highlight it in the message table.
function displayMessage(message) {

    displayMessageImpl(escapeHtml(message));
    setTimeout(function () { $('.messageRow.newMessage').removeClass('newMessage').addClass('oldMessage'); }, 1000);
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

function findLocation(x, y) {
    return g_locationData.where({ x: x, y: y })[0];
}

function findPlayerLocation() {
    return findLocation(g_gameData.player.location.x, g_gameData.player.location.y)
}

function describeLocationContents(location, detailLevel) {
    var message = "";

    if (detailLevel >= describeDetailEnum.TERRAIN_AND_CONTENTS) {
        // TODO: format the list better. Say "two dwarves" rather than "a dwarf and a dwarf".
        var numCharacters = location.attributes.characters.length;
        if (numCharacters > 0) {
            message += " There is a ";
            for (var i = 0; i < numCharacters; i++) {
                message += location.attributes.characters[i].type;
                if (i < numCharacters - 2) {
                    message += ", a ";
                } else if (i == numCharacters - 2) {
                    message += ", and a ";
                }
            }
            message += ". ";
        }

        var numItems = location.attributes.items.length;
        if (numItems > 0) {
            message += " There is a ";
            for (var i = 0; i < numItems; i++) {
                message += location.attributes.items[i].type;
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
    var message = "Terrain: " + location.attributes.type + ".";
    message += describeLocationContents(location, detailLevel);
    return message;
}

function describeMyLocation(location) {
    showPlayerLocation(location);
    var message = "You are at location [" + location.attributes.x + ", " +
        location.attributes.y + "]. Terrain: " + location.attributes.type + ".";
    message += describeLocationContents(location, describeDetailEnum.TERRAIN_AND_CONTENTS);
    return message;
}

function handleCommand(playerLocation, commandText, callback) {
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

    // This command can't be handled locally. Send to the game engine.
    gameEngine.gameCommand(commandText, callback);
    // If it returned an error:
    // displayMessageBlock(escapeHtml(data.message));

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

        switch (tokens[1]) {
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

        if (!locationExists(newY - 1, newX - 1)) {
            var errorMessage = "That direction is beyond the edge of the world.";
            displayMessageBlock(errorMessage);
            return false;
        }

        var newLocation = mapLocationData[newY - 1][newX - 1];
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
        var parseNumber = parseInt(tokens[tokens.length - 1]);
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

        switch (directions[i]) {
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
        var originalX = parseInt(playerLocation.attributes.x);
        var originalY = parseInt(playerLocation.attributes.y);
        var newX = originalX + deltaX;
        var newY = originalY + deltaY;
        console.log("searching for location [" + newX + ", " + newY + "].");

        var newLocation = findLocation(newX.toString(), newY.toString());
        if (!newLocation) {
            continue;
        }

        var message = "To the " + directions[i] + " - ";
        message += describeLocation(newLocation, describeDetailEnum.TERRAIN_ONLY);
        displayMessage(message);
    }

    displayMessage("");
}

function describeLocationCharacter(playerLocation, characterName, characterNumber) {
    var matchedIndex = null;
    for (var i = 0; i < playerLocation.attributes.characters.length; i++) {
        if (playerLocation.attributes.characters[i].type === characterName) {
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

    if (matchedIndex === null) {
        return false;
    }

    var thisCharacter = playerLocation.attributes.characters[matchedIndex];
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
        if (Object.prototype.toString.call(thisCharacter.drops) === '[object Array]') {
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
    for (var i = 0; i < playerLocation.attributes.items.length; i++) {
        if (playerLocation.attributes.items[i].type === itemName) {
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

    if (matchedIndex === null) {
        return false;
    }

    var thisItem = playerLocation.attributes.items[matchedIndex];
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
    return (findLocation(x, y) !== undefined);
}

function handleInventory(playerLocation, tokens) {
    // For now the assumption is that you are playing as g_gameData.players[0].
    // This will not be true when we support multi-player mode.
    var inventory = g_gameData.player.inventory;
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
    // For now the assumption is that you are playing as g_gameData.players[0].
    // This will not be true when we support multi-player mode.

    var playerInfo = findPlayer.findPlayerByName(g_gameData, g_gameData.player.name);
    if (null === playerInfo) {
        console.log("in handleUse.find() invalid player.");
        return;
    }

    displayMessage("Health: " + playerInfo.player.health);
    displayMessage("Damage: " + playerInfo.player.damage);

    var usingMessage = "You are not using any objects.";
    if (playerInfo.player.using.length > 0)
    {
        usingMessage = "Using: ";
        for (var j = 0; j < playerInfo.player.using.length; j++) {
            usingMessage += playerInfo.player.using[j].type;
            if (j < playerInfo.player.using.length -1) {
                usingMessage = usingMessage + ",";
            }
        }
    }
    displayMessage(usingMessage);

    var allComplete = true;
    if (g_currentRealmData.objectives.length > 0) {
        displayMessage("Objective progress:");
        for (var i = 0; i < g_currentRealmData.objectives.length; i++) {
            // Special handling for the "Start at" objective. It is automatically completed.
            if (g_currentRealmData.objectives[i].type === "Start at") {
                continue;
            }

            if (g_currentRealmData.objectives[i].completed === "false") {
                allComplete = false;
            }

            displayMessage("&nbsp;&nbsp;" +
                buildObjectiveDescription(
                    g_currentRealmData.objectives[i]) + ": " +
                    (g_currentRealmData.objectives[i].completed === "true" ? "complete" : "not complete"));
        }

        // TODO: "start at" doesn't really count as an objective. If that is the only one then say
        // "you have no objectives".
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
