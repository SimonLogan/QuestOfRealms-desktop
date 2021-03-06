/**
 * Handle game commands and database access.
 * (c) Simon Logan 2019
 */

const dbWrapper = require('../utils/dbWrapper');
const async = require('async');
const _ = require('underscore');
const app = electron.remote.app;

var g_gameData;
var g_currentRealmData;
var g_dependencyInfo;

var g_gameInfo = {};

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

// Find an item
class itemInfo {
    constructor(item, itemIndex) {
        this.item = item;
        this.itemIndex = itemIndex;
    }
}

class findItem {
    static findItemByType(collection, itemType) {
        if (collection === undefined) {
            return null;
        }

        for (var i = 0; i < collection.length; i++) {
            // TODO: handle ambiguous object descriptions (e.g. "take sword" when there are two swords).
            if (collection[i].type === itemType) {
                return new itemInfo(collection[i], i);
            }
        }

        return null;
    }
}

// Find a character
class characterInfo {
    constructor(character, characterIndex) {
        this.character = character;
        this.characterIndex = characterIndex;
    }
}

class findCharacter {
    static findLocationCharacterByType(location, characterType) {
        if (location.characters === undefined) {
            return null;
        }

        for (var i = 0; i < location.characters.length; i++) {
            if (location.characters[i].type === characterType) {
                return new characterInfo(location.characters[i], i);
            }
        }

        return null;
    }
}

module.exports = {
    initialize: function (gamePath, launchArgs, dependencyInfo, loadCallback) {
        // Initialize the game engine by loading the specfied game.
        // Params:
        //   dbPath - the location of the game db.
        //   loadCallback - a function to notify the caller when the game
        //                  has finished loading.
        async.waterfall([
            function (callback) {
                g_dependencyInfo = dependencyInfo;
                g_gameInfo = {
                    'name': launchArgs.name,
                    'gamePath': gamePath,
                    'gameInstance': launchArgs.instance,
                    'maxGameInstance': launchArgs.maxInstance
                };

                var dbPath = path.join(gamePath, launchArgs.instance.toString());
                dbWrapper.openGameDB(callback, dbPath);
            },
            function (callback) {
                loadGame(callback);
            },
            function (callback) {
                // Initially assume the first realm. Later, we need to
                // load the current realm from the player data.
                loadRealm(g_gameData.player.location.realm, callback);
            }
        ],
        function (err, results) {
            loadCallback(err);
        });
    },
    getGameData: function () {
        // Return a copy of gameData;
        return local_getGameData();
    },
    getCurrentRealmData: function () {
        // Return a copy of currentRealmData;
        return local_getCurrentRealmData();
    },
    updatePlayer: function (player) {
        // Used only to update the player info the first time
        // a realm is launched. Do not call this at any other time.
        g_gameData.player = player;
    },
    gameCommand: function (command, callback) {
        // In a multiplayer game, gameCommand() would be invoked via
        // an HTTP request. It would return ok or fail (HTTP 200 or 500)
        // to indicate whether the command could be handled. The result
        // of the command would be broadcast later via socket.io.
        // In the single-player game, the callback function is used instead
        // of the websocket broadcast. There could be multiple results
        // returned in either case, for example completing an action and
        // completing a goal as a result of the action.

        // Split the comandline into whitespace-separated tokens. Remove the first and use
        // this as the command verb. The others are the args.
        var tokens = command.split(" ");
        var verb = tokens.shift();
        switch (verb) {
            // Pass the raw command to the handlers as they may need to split it
            // in command-specific ways.
            case "move":
                handleMove(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleMove result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("responseData")) {
                        if (handlerResult.responseData.hasOwnProperty("data")) {
                            checkObjectives(handlerResult.responseData.data.game, g_gameData.player, callback);
                        }
                    }
                });
                break;
            case "take":
                handleTake(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleTake result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("responseData")) {
                        if (handlerResult.responseData.hasOwnProperty("data")) {
                            checkObjectives(handlerResult.responseData.data.game, g_gameData.player, callback);
                        }
                    }
                });
                break;
            case "buy":
                handleBuy(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleBuy result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("responseData")) {
                        if (handlerResult.responseData.hasOwnProperty("data")) {
                            checkObjectives(handlerResult.responseData.data.game, g_gameData.player, callback);
                        }
                    }
                });
                break;
            case "drop":
                handleDrop(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleDrop result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("responseData")) {
                        if (handlerResult.responseData.hasOwnProperty("data")) {
                            checkObjectives(handlerResult.responseData.data.game, g_gameData.player, callback);
                        }
                    }
                });
                break;
            case "give":
                handleGive(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleGive result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("responseData")) {
                        if (handlerResult.responseData.hasOwnProperty("data")) {
                            checkObjectives(handlerResult.responseData.data.game, g_gameData.player, callback);
                        }
                    }
                });
                break;
            case "use":
                handleUse(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleUse result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("responseData")) {
                        if (handlerResult.responseData.hasOwnProperty("data")) {
                            checkObjectives(handlerResult.responseData.data.game, g_gameData.player, callback);
                        }
                    }
                });
                break;
            case "fight":
                handleFight(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleFight result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("responseData")) {
                        if (handlerResult.responseData.hasOwnProperty("data")) {
                            checkObjectives(handlerResult.responseData.data.game, g_gameData.player, callback);
                        }
                    }
                });
                break;
            case "level":
                handleLevelUp(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleLevelUp result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);
                    // No need to check objectives after level up.
                });
                break;
            case "save":
                handleSave(command, function (saveResult) {
                    console.log("in gameCommand. handleSave result = " + JSON.stringify(saveResult));
                    callback(saveResult);
                });
                break;
            default:
                handleCommand(command, g_gameData.player, function (handlerResult) {
                    console.log("in gameCommand. handleCommand result = " + handlerResult);
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("responseData")) {
                        if (handlerResult.responseData.hasOwnProperty("data")) {
                            checkObjectives(handlerResult.responseData.data.game, g_gameData.player, callback);
                        }
                    }
                });
        }
    },
};

function loadGame(callback) {
    console.log(Date.now() + 'gameEngine.loadGame()');

    var db_collections = dbWrapper.getDBs();
    db_collections.game.find({}, function (err, data) {
        console.log("loadGame found data: " + JSON.stringify(data));

        if (err) {
            var msg = "Error loading game.db - " + err;
            alert(msg);
            callback(msg);
            return;
        }

        // There should be only one matching game.
        if (data.length > 1) {
            var msg = "Invalid game.db - expecting only one entry";
            alert(msg);
            callback(msg);
            return;
        }

        g_gameData = data[0];
        callback(null);
    });
}

function loadRealm(realmId, callback) {
    console.log('gameEngine.loadRealm() ' + realmId);

    var db_collections = dbWrapper.getDBs();
    db_collections.questrealms.find({ _id: realmId }, function (err, data) {
        console.log("gameEngine.loadRealm found data: " + JSON.stringify(data));

        g_currentRealmData = data[0];
        callback(null);
    });
}

function local_getGameData() {
    // Return a copy of gameData;
    return JSON.parse(JSON.stringify(g_gameData));
}

function local_getCurrentRealmData() {
    return JSON.parse(JSON.stringify(g_currentRealmData));
}

function saveGame(callback) {
    console.log(Date.now() + ' saveGame');

    var db_collections = dbWrapper.getDBs();
    db_collections.game.update({ _id: g_gameData._id }, g_gameData, {}, function (err, numReplaced) {
        console.log("saveGame err:" + err);
        console.log("saveGame numReplaced:" + numReplaced);
        callback(null);
    });
}

function saveRealm(callback) {
    console.log(Date.now() + ' saveRealm');

    var db_collections = dbWrapper.getDBs();
    db_collections.questrealms.update({ _id: g_currentRealmData._id }, g_currentRealmData, {}, function (err, numReplaced) {
        console.log("saveRealm err:" + err);
        console.log("saveRealm numReplaced:" + numReplaced);
        callback(null);
    });
}

// Consider using a backbone collection for the maplocations here.
// For now just filter the data directly.
function findLocation(x, y) {
    for (var i = 0; i < g_currentRealmData.mapLocations.length; i++) {
        if (g_currentRealmData.mapLocations[i].x === x &&
            g_currentRealmData.mapLocations[i].y === y) {
            return g_currentRealmData.mapLocations[i];
        }
    }

    return null;
}

// Try to fnd a handler function for the specified action.
// Specifying useDefault: true for the findOptions will
// look for a default handler if the module does not
// provide one.
function findHandler(object, action, findOptions) {
    var path = require('path');
    var gameDir = path.join(app.getPath('userData'), "games", g_gameData.name);
    console.log("gameDir: " + gameDir);

    var handlerFunc = null;

    var tryHandlers = [
        path.join(gameDir, "modules", object.module, object.filename)
    ];

    if (findOptions && findOptions.hasOwnProperty('useDefault') && findOptions.useDefault === true) {
        tryHandlers.push(path.join(gameDir, "modules", "default", "default-handlers.js"));
    }

    for (var i = 0; i < tryHandlers.length; i++) {
        var handlerPath = tryHandlers[i];
        console.log("tryhandlers[" + i + "] = " + handlerPath);
        try {
            module = require(handlerPath);
        } catch (err) {
            console.log(JSON.stringify(err));
            continue;
        }

        if (module.handlers !== undefined && module.handlers[action] !== undefined) {
            handlerFunc = module.handlers[action];
            console.log("found " + action + " handler");
            break;
        } else {
            console.log("1 Module: " + handlerPath +
                        " does not have a handler for \"" + action + "\".");
        }
    }

    return handlerFunc;
}

// Javascript passes objects by reference. We don't want plugins to be
// able to modify game data, so provide the ability to make a copy
// of an object.
function copyData(data) {
    return JSON.parse(JSON.stringify(data));
}

function handleMove(command, player, statusCallback) {
    var direction = command.replace(/move[\s+]/i, "");
    console.log("MOVE: " + direction);

    var deltaX = 0;
    var deltaY = 0;
    switch (direction) {
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
            var errorMessage = "Unknown direction " + direction;
            console.log(errorMessage);
            statusCallback({ error: true, message: errorMessage });
            return;
    }

    // Does the requested location exist? First get the current player location.
    var originalX = parseInt(player.location.x);
    var originalY = parseInt(player.location.y);
    var newX = originalX + deltaX;
    var newY = originalY + deltaY;

    var newLocation = findLocation(newX.toString(), newY.toString());
    if (!newLocation) {
        var errorMessage = "Don't be daft, you'll fall off the end of the world!";
        console.log("new location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    // TODO: store the coordinates as int instead of string.
    var notifyData = {};

    // Ensure the player has enough health to move into the new location.
    // TODO: decide whether we want to use health for this. Do we need a
    // separate stamina figure for travel, and reserve health for fighting?
    /*
    var healthCost = newLocation.healthCost;
    var playerHealth = game.players[playerInfo.playerIndex].health;
    if (healthCost >= playerHealth) {
        console.log("Not enough health (" + playerHealth + ")" +
                        " to move into location (cost:" + healthCost + ")." +
                        " You died.");
        game.players[playerInfo.playerIndex].health = 0;
        notifyData = {
            playerName: player.name,
            description: {
                action: "death",
                details: "You did not have enough health to move into that location."
            },
            data: {}
        };
    } else {
        game.players[playerInfo.playerIndex].health -= healthCost;
    */
    player.location.x = newX.toString();
    player.location.y = newY.toString();

    // Update the list of locations the player has visited.
    // This is a dictionary for quick searching. Using a list
    // will scale badly when drawing the whole map on the UI.
    var visitedKey = newX.toString() + "_" + newY.toString();
    var playerVistitedLocation = (visitedKey in player.visited[g_currentRealmData._id]);
    if (!playerVistitedLocation) {
        player.visited[g_currentRealmData._id][visitedKey] = true;
    }

    notifyData = {
        playerName: player.name,
        description: {
            action: "move",
            message: "You have moved to location [" + newX + "," + newY + "].",
            from: { x: originalX, y: originalY },
            to: { x: newX, y: newY }
        },
        data: { game: local_getGameData() }
    };

    statusCallback({ error: false, responseData: notifyData });
    return;
}

function handleTake(command, player, statusCallback) {
    command = command.replace(/take[\s+]/i, "");
    var commandArgs = command.split("from");
    var objectName = commandArgs[0].trim();
    var targetName = null;

    if (commandArgs.length === 1) {
        console.log("TAKE: " + objectName);
    } else {
        // "take object from NPC"
        targetName = commandArgs[1].trim();
        console.log("TAKE: " + objectName + " from " + targetName);
    }

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".

    // Get the current player location.
    var currentX = player.location.x;
    var currentY = player.location.y;
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (!targetName) {
        handleTakeFromLocation(objectName, currentLocation, player, statusCallback);
    } else {
        handleTakeFromNPC(objectName, targetName, currentLocation, player, statusCallback);
    }
}

function handleTakeFromLocation(objectName, currentLocation, player, statusCallback) {
    // Find the requested item in the current mapLocation.
    var itemInfo = findItem.findItemByType(currentLocation.items, objectName);
    if (itemInfo === null) {
        var errorMessage = "There is no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (undefined === player.inventory) {
        player.inventory = [];
    }

    player.inventory.push(itemInfo.item);
    currentLocation.items.splice(itemInfo.itemIndex, 1);

    notifyData = {
        playerName: player.name,
        description: {
            action: "take",
            message: "You have taken a " + itemInfo.item.type,
            item: itemInfo.item
        },
        data: {
            game: local_getGameData(),
            mapLocation: copyData(currentLocation)
        }
    };

    statusCallback({ error: false, responseData: notifyData });
    return;
}

function handleTakeFromNPC(objectName, targetName, currentLocation, player, statusCallback) {
    // Find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    var foundIndex = -1;
    var foundInventoryItem = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
        if (characterInfo.character.inventory[j].type === objectName) {
            foundIndex = j;
            foundInventoryItem = characterInfo.character.inventory[foundIndex];
        }
    }

    if (foundIndex === -1) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    // We found the item. See if we can take it.
    var handlerFunc = findHandler(characterInfo.character, "take from");
    if (!handlerFunc) {
        statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
        return;
    }

    handlerFunc(
        copyData(characterInfo.character),
        copyData(foundInventoryItem),
        copyData(player),
        function (handlerResp) {
            if (!handlerResp) {
                console.log("1 Take from failed - null handlerResp");
                statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
                return;
            }

            if (!handlerResp.description.success) {
                console.log("2 Take from failed: " + handlerResp.description.message);
                statusCallback({ error: true, message: handlerResp.description.message });
                return;
            }

            // Take worked, so update the player and target.
            // Record who we took the object from so we can check for
            // "acquire from" objectives.
            foundInventoryItem.source = { reason: "take from", from: targetName };
            characterInfo.character.inventory.splice(foundIndex, 1);

            if (player.inventory === undefined) {
                player.inventory = [];
            }
            player.inventory.push(foundInventoryItem);

            notifyData = {
                playerName: player.name,
                description: {
                    action: "take",
                    message: "You have taken a " + objectName + " from the " + targetName,
                    item: itemInfo.item
                },
                data: {
                    game: local_getGameData(),
                    mapLocation: copyData(currentLocation)
                }
            };

            statusCallback({ error: false, responseData: notifyData });
            return;
        });
}

function handleBuy(command, player, statusCallback) {
    command = command.replace(/buy[\s+]/i, "");
    var commandArgs = command.split("from");
    var objectName = commandArgs[0].trim();
    var targetName = null;

    // You can only buy from an NPC, so one must be specified.
    if (commandArgs.length === 1) {
        console.log("in handleBuy.find() invalid NPC.");
        statusCallback({ error: true, message: "Invalid NPC" });
        return;
    }

    targetName = commandArgs[1].trim();
    console.log("BUY: " + objectName + " from " + targetName);

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".

    // Get the current player location.
    var currentX = player.location.x;
    var currentY = player.location.y;
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    handleBuyFromNPC(objectName, targetName, currentLocation, player, statusCallback);
}

function handleBuyFromNPC(objectName, targetName, currentLocation, player, statusCallback) {
    // Find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    var foundIndex = -1;
    var foundInventoryItem = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
        if (characterInfo.character.inventory[j].type === objectName) {
            // Assume the buy will be successful. If not, we will
            // discard this edit.
            foundIndex = j;
            foundInventoryItem = characterInfo.character.inventory[foundIndex];
            break;
        }
    }

    if (foundIndex === -1) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    // We found the item. See if we can buy it.
    var handlerFunc = findHandler(characterInfo.character, "buy from");
    if (!handlerFunc) {
        statusCallback({ error: true, message: "The " + targetName + " won't sell you the " + objectName });
        return;
    }

    // TODO: pass copies of characterInfo, object, and gameData
    handlerFunc(
        copyData(characterInfo.character),
        copyData(foundInventoryItem),
        copyData(player),
        function (handlerResp) {
            if (!handlerResp) {
                console.log("1 Buy from failed - null handlerResp");
                statusCallback({ error: true, message: "The " + targetName + " won't sell you the " + objectName });
                return;
            }

            if (!handlerResp.description.success) {
                console.log("2 Buy from failed: " + handlerResp.description.message);
                statusCallback({ error: true, message: handlerResp.description.message });
                return;
            }

            // Buy worked, so update the player and target.
            // Record who we bought the object from so we can check for
            // "acquire from" objectives.
            foundInventoryItem.source = { reason: "buy from", from: targetName };
            characterInfo.character.inventory.splice(foundIndex, 1);

            if (player.inventory === undefined) {
                player.inventory = [];
            }
            player.inventory.push(foundInventoryItem);

            //  Now pay!
            if (handlerResp.data && handlerResp.data.payment && handlerResp.data.payment.type) {
                for (var i = 0; i < player.inventory.length; i++) {
                    if (player.inventory[i].type === handlerResp.data.payment.type) {
                        characterInfo.character.inventory.push(player.inventory[i]);
                        player.inventory.splice(i, 1);
                        break;
                    }
                }
            }

            notifyData = {
                playerName: player.name,
                description: {
                    action: "buy",
                    message: "You have bought a " + objectName + " from the " + targetName,
                    item: itemInfo.item
                },
                data: {
                    game: local_getGameData(),
                    mapLocation: copyData(currentLocation)
                }
            };

            statusCallback({ error: false, responseData: notifyData });
            return;
        });
}

function handleDrop(command, player, statusCallback) {
    var target = command.replace(/drop[\s+]/i, "");

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    console.log("DROP: " + target);

    // Get the current player location.
    var currentX = player.location.x;
    var currentY = player.location.y;
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    // Find the requested item in the inventory.
    var foundIndex = -1;
    for (var i = 0; i < player.inventory.length; i++) {
        // TODO: handle ambiguous object descriptions (e.g. "drop sword" when there are two swords).
        if (player.inventory[i].type !== target) {
            continue;
        }

        foundIndex = i;
        break;
    }

    if (foundIndex == -1) {
        var errMsg = "You do not have a " + target;
        console.log(errMsg);
        statusCallback({ error: true, message: errMsg });
        return;
    }

    found = true;
    var item = player.inventory[i];
    if (undefined === currentLocation.items) {
        currentLocation.items = [];
    }

    currentLocation.items.push(item);
    player.inventory.splice(i, 1);

    if (player.using && _.isEqual(player.using, item)) {
        player.using = [];
    }

    notifyData = {
        playerName: player.name,
        description: {
            action: "drop",
            message: "You have dropped a " + item.type,
            item: item,
        },
        data: {
            game: local_getGameData(),
            mapLocation: copyData(currentLocation)
        }
    };

    statusCallback({ error: false, responseData: notifyData });
    return;
}

function handleGive(command, player, statusCallback) {
    command = command.replace(/give[\s+]/i, "");
    var commandArgs = command.split("to");
    var objectName = commandArgs[0].trim();

    if (commandArgs.length != 2) {
        console.log("in handleGive() command not in the format \"give object to recipient\".");
        statusCallback({ error: true, message: "invalid command" });
        return;
    }

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    var targetName = commandArgs[1].trim();
    console.log("GIVE: " + objectName + " to " + targetName);

    // Get the current player location.
    var currentX = player.location.x;
    var currentY = player.location.y;
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    handleGiveToNPC(objectName, targetName, currentLocation, player, statusCallback);
}

function handleGiveToNPC(objectName, targetName, currentLocation, player, statusCallback) {
    // Find the requested item in the specified target's inventory.
    if (player.inventory === undefined) {
        var errorMessage = "You do not have an " + objectName;
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    var foundInventoryItem = null;
    var foundItemIndex = -1;
    for (var i = 0; i < player.inventory.length; i++) {
        // TODO: handle ambiguous object descriptions (e.g. "give sword..." when there are two swords).
        if (player.inventory[i].type === objectName) {
            // Update the player inventory now. If the give operation fails we
            // won't save this change.
            foundItemIndex = i;
            foundInventoryItem = player.inventory[foundItemIndex];
            break;
        }
    }

    if (foundItemIndex === -1) {
        var errorMessage = "You do not have an " + objectName;
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    // Found the item, now find the recipient.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    var handlerFunc = findHandler(characterInfo.character, "give");
    if (!handlerFunc) {
        statusCallback({ error: true, message: "You can't give an " + objectName + " to the " + targetName });
        return;
    }

    handlerFunc(
        targetName,
        copyData(foundInventoryItem),
        copyData(player),
        function (handlerResp) {
            if (!handlerResp) {
                console.log("Give failed - null handlerResp");
                statusCallback({ error: true, message: "Failed to give an " + objectName + " to the " + targetName });
                return;
            }

            if (!handlerResp.description.success) {
                console.log("Give failed: " + handlerResp.description.message);
                statusCallback({ error: true, message: handlerResp.description.message });
                return;
            }

            var usingItemInfo = findItem.findItemByType(player.using, objectName);
            if (usingItemInfo) {
                // You are using that item. Not any more...
                player.using.splice(usingItemInfo.itemIndex, 1);
            }

            // Give worked, so update the recipient.
            // Record who gave the object so we can check for "give" objectives.
            foundInventoryItem.source = { reason: "give", from: player.name };
            player.inventory.splice(foundItemIndex, 1);

            if (characterInfo.character.inventory === undefined) {
                characterInfo.character.inventory = [];
            }
            characterInfo.character.inventory.push(foundInventoryItem);

            notifyData = {
                playerName: player.name,
                description: {
                    action: "give",
                    message: "You have given a " + objectName + " to the " + targetName,
                    item: itemInfo.item
                },
                data: {
                    game: local_getGameData(),
                    mapLocation: copyData(currentLocation)
                }
            };

            // In a multiplayer game, we need to broadcast the status update.
            //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
            //sails.io.sockets.emit(realmId + "-status", notifyData);

            statusCallback({ error: false, responseData: notifyData });
            return;
        });
}

function handleUse(command, player, statusCallback) {
    commandArgs = command.replace(/use[\s+]/i, "");

    console.log("Use: " + JSON.stringify(commandArgs));

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    var objectName = commandArgs.trim();

    // Find the requested item in the inventory.
    var item = null;
    var foundItemIndex = -1;
    for (var i = 0; i < player.inventory.length; i++) {
        // TODO: handle ambiguous object descriptions (e.g. "use sword" when there are two swords).
        if (player.inventory[i].type !== objectName) {
            continue;
        }

        item = copyData(player.inventory[i]);
        foundItemIndex = i;
        break;
    }

    if (!item) {
        var errorMessage = "You do not have a " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    var moduleData = g_dependencyInfo[item.module][item.filename][item.type];
    item.damage = readProperty(item.damage, moduleData.damage);

    // Call the optional handler, or use the default one (inline below) if no custom handler is available.
    var handlerFunc = findHandler(item, "use");
    if (!handlerFunc) {
        // Not an error - just perform the default action - mark the item as
        // being used. It will replace the item you are currently using.
        player.using = [];
        player.using.push(item);
        player.damage = Math.max(player.damage, item.damage);

        notifyData = {
            playerName: player.name,
            description: {
                action: "use",
                message: "You are using the " + item.type,
                item: itemInfo.item
            },
            data: {
                game: local_getGameData()
            }
        };

        statusCallback({ error: false, responseData: notifyData });
        return;
    } else {
        handlerFunc(
            copyData(item),
            copyData(player),
            function (handlerResp) {
                if (!handlerResp) {
                    console.log("1 use - null handlerResp");
                    statusCallback({ error: true, message: "You cannot use the " + objectName });
                    return;
                }

                if (!handlerResp.description.success) {
                    console.log("2 use failed: " + handlerResp.description.message);
                    statusCallback({ error: true, message: handlerResp.description.message });
                    return;
                }

                // Don't update the game if there was no response from the handler.
                if (!handlerResp.hasOwnProperty('data')) {
                    handlerResp.data = { game: game, mapLocation: currentLocation };
                    statusCallback({ error: false, data: handlerResp });
                    return;
                }

                // The handler may have updated the player. Use it if found.
                if (handlerResp.data.hasOwnProperty("player")) {
                    player = handlerResp.data.player;
                }

                var moduleData = g_dependencyInfo[item.module][item.filename][item.type];
                var consumable = readProperty(item.consumable, moduleData.consumable);
                if (consumable) {
                    // The item has been used up. Remove it from the inventory.
                    player.inventory.splice(foundItemIndex, 1);
                }

                // We need to do this here because we reassigned player to point to
                // handlerResp.data.player at line 1075. Since player no longer points
                // to g_gameData.player we need to assign the updated object to update
                // the game.
                g_gameData.player = player;

                notifyData = {
                    playerName: player.name,
                    description: {
                        action: "use",
                        message: handlerResp.description.message
                    },
                    data: {
                        game: local_getGameData()
                    }
                };

                statusCallback({ error: false, responseData: notifyData });
                return;
            });
    }
}

function handleFight(command, player, statusCallback) {
    command = command.replace(/fight[\s+]/i, "");
    var commandArgs = command.split("for");
    var targetName = commandArgs[0].trim();
    var objectName = null;

    if (commandArgs.length === 1) {
        console.log("FIGHT: " + targetName);
    } else {
        // "fight NPC for sword"
        objectName = commandArgs[1].trim();
        console.log("FIGHT: " + targetName + " for " + objectName);
    }

    // TODO: for now object is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".

    // Get the current player location.
    var currentX = player.location.x;
    var currentY = player.location.y;
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (objectName === null) {
        handleFightNPC(targetName, currentLocation, player, statusCallback);
    } else {
        handleFightNPCforItem(targetName, objectName, currentLocation, player, statusCallback);
    }
}

function handleCharacterDeath(character, currentLocation) {
    // The character will drop its inventory.
    if (character.inventory !== undefined) {
        for (var i = 0; i < character.inventory.length; i++) {
            currentLocation.items.push(character.inventory[i]);
        }
    }

    character.inventory = [];

    /// TODO: handle character.drops
}

function handlePlayerDeath(player, currentLocation) {
    // You will drop your inventory.
    for (var i = 0; i < player.inventory.length; i++) {
        currentLocation.items.push(player.inventory[i]);
    }

    player.inventory = [];
}

// Fight with no particular objective in mind.
function handleFightNPC(targetName, currentLocation, player, statusCallback) {
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    // Perform the default fight operation and call the optional handler to modify the
    // NPC's behaviour.
    var handlerFunc = findHandler(characterInfo.character, "fight", { 'useDefault': true });
    if (!handlerFunc) {
        statusCallback({ error: true, message: "There is no handler for \"fight\" available" });
        return;
    }

    var moduleData = g_dependencyInfo[characterInfo.character.module]
    [characterInfo.character.filename][characterInfo.character.type];
    characterInfo.character.health = readProperty(characterInfo.character.health, moduleData.health);
    characterInfo.character.damage = readProperty(characterInfo.character.damage, moduleData.damage);

    console.log(
        "Before fight. player.health: " + player.health +
        ", player.damage: " + player.damage +
        ", character.health: " + characterInfo.character.health +
        ", character damage: " + characterInfo.character.damage);

    var character_type = characterInfo.character.type;

    // Note on the message strings below. If we ever wish to localise the strings,
    // "You are too weak to fight. The ${character_type} was victorious." is much better
    // for translators as there is a full sentence to work with, and the embedded named
    // token gives info about what data it contains. Compare this to the much worse
    // translate("You are too weak to fight. The ") + character.type + translate(" was victorious.");

    // The player can't fight if health is 0.
    if (player.health === 0) {
        var message = `You are too weak to fight. The ${character_type} was victorious.`;
        var notifyData = {
            playerName: player.name,
            description: {
                action: "fight",
                success: true,
                message: message
            },
            data: {}
        };

        statusCallback({ error: false, responseData: notifyData });
        return;
    }

    var characterOrigHealth = characterInfo.character.health;
    var playerOrigHealth = player.health;
    handlerFunc(
        copyData(characterInfo.character),
        copyData(player),
        function (handlerResp) {
            if (!handlerResp) {
                console.log("1 fight - null handlerResp");
                statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
                return;
            }

            if (!handlerResp.description.success) {
                console.log("2 fight failed: " + handlerResp.description.message);
                statusCallback({ error: true, message: handlerResp.description.message });
                return;
            }

            // Don't update the game if there was no response from the handler.
            if (!handlerResp.hasOwnProperty('data')) {
                handlerResp.data = { game: game, mapLocation: currentLocation };
                statusCallback({ error: false, data: handlerResp });
                return;
            }

            var characterDied = false;
            var playerDied = false;
            var playerWon = false;

            // The victor is the combatant that does the biggest %age damage to the opponent.
            var playerHealth = handlerResp.data.playerHealth;
            var characterHealth = handlerResp.data.characterHealth;
            var playerDamageDealt = Math.round(((characterOrigHealth - characterHealth) / characterOrigHealth) * 100);
            var characterDamageDealt = Math.round(((playerOrigHealth - playerHealth) / playerOrigHealth) * 100);

            console.log(
                "After fight. player.health: " + playerHealth +
                ", character.health: " + characterHealth +
                ", player dealt damage: " + playerDamageDealt + "% " +
                ", character dealt damage: " + characterDamageDealt + "%");

            message = "You fought valiantly.";
            if (characterHealth === 0 && playerHealth > 0) {
                message = `You fought valiantly. The ${character_type} died.`;
                characterDied = true;
                playerWon = true;
            } else if (characterHealth > 0 && playerHealth === 0) {
                message = "You fought valiantly, but you died.";
                playerDied = true;
            } else if (characterHealth === 0 && playerHealth === 0) {
                message = "You fought valiantly, but you both died.";
                characterDied = true;
                playerDied = true;
            } else {
                // Neither died. Judge the victor on who dealt the highest %age damage, or if damage
                // was equal, judge based on remaining strength.
                if ((playerDamageDealt > characterDamageDealt) ||
                    ((playerDamageDealt === characterDamageDealt) &&
                     (playerHealth > characterHealth))) {
                    message = "You fought valiantly and were victorious.";
                    playerWon = true;
                } else if ((characterDamageDealt > playerDamageDealt) ||
                           ((playerDamageDealt === characterDamageDealt) &&
                            (characterHealth > playerHealth))) {
                                message = `You fought valiantly but unfortunately the ${character_type} was victorious.`;
                } else {
                    // Evenly matched so far, declare a draw.
                    message = "You both fought valiantly, but are evently matched.";
                }
            }

            player.health = playerHealth;
            characterInfo.character.health = characterHealth;

            if (characterDied) {
                handleCharacterDeath(characterInfo.character, currentLocation);
                currentLocation.characters.splice(characterInfo.characterIndex, 1);
            }

            if (playerDied) {
                handlePlayerDeath(player, currentLocation);
            }

            var preamble = "";
            if (handlerResp.description.hasOwnProperty("message")) {
                preamble = handlerResp.description.message + " ";
            }
            notifyData = {
                playerName: player.name,
                description: {
                    action: "fight",
                    message: preamble + message
                },
                data: {}
            };

            notifyData.data = {
                game: local_getGameData(),
                mapLocation: copyData(currentLocation)
            };

            statusCallback({ error: false, responseData: notifyData });
            return;
        });
}

// Fight until you beat the NPC and take the object
function handleFightNPCforItem(targetName, objectName, currentLocation, player, statusCallback) {
    // If fighting for an object, find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    var foundIndex = -1;
    var foundInventoryItem = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
        if (characterInfo.character.inventory[j].type === objectName) {
            foundIndex = j;
            foundInventoryItem = characterInfo.character.inventory[foundIndex];
        }
    }

    if (foundIndex === -1) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }


    var handlerFunc = findHandler(characterInfo.character, "fight for", { 'useDefault': true });
    if (!handlerFunc) {
        statusCallback({ error: true, message: "There is no handler for \"fight for\" available" });
        return;
    }

    var moduleData = g_dependencyInfo[characterInfo.character.module]
    [characterInfo.character.filename][characterInfo.character.type];
    characterInfo.character.health = readProperty(characterInfo.character.health, moduleData.health);
    characterInfo.character.damage = readProperty(characterInfo.character.damage, moduleData.damage);

    console.log(
        "Before fight. player.health: " + player.health +
        ", player.damage: " + player.damage +
        ", character.health: " + characterInfo.character.health +
        ", character damage: " + characterInfo.character.damage);

    var character_type = characterInfo.character.type;

    // Note on the message strings below. If we ever wish to localise the strings,
    // "You are too weak to fight. The ${character_type} was victorious." is much better
    // for translators as there is a full sentence to work with, and the embedded named
    // token gives info about what data it contains. Compare this to the much worse
    // translate("You are too weak to fight. The ") + character.type + translate(" was victorious.");

    // The player can't fight if health is 0.
    if (player.health === 0) {
        var message = `You are too weak to fight. The ${character_type} was victorious.`;
        var notifyData = {
            playerName: player.name,
            description: {
                action: "fight",
                success: true,
                message: message
            },
            data: {}
        };

        statusCallback({ error: false, responseData: notifyData });
        return;
    }

    var characterOrigHealth = characterInfo.character.health;
    var playerOrigHealth = player.health;
    handlerFunc(
        copyData(characterInfo.character),
        copyData(foundInventoryItem),
        copyData(player),
        function (handlerResp) {
            console.log("handlerResp: " + handlerResp);
            if (!handlerResp) {
                console.log("1 fight for - null handlerResp");
                statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
                return;
            }

            if (!handlerResp.description.success) {
                console.log("2 fight for failed: " + handlerResp.description.message);
                statusCallback({ error: true, message: handlerResp.description.message });
                return;
            }

            // Don't update the game if there was no response from the handler.
            if (!handlerResp.hasOwnProperty('data')) {
                handlerResp.data = { game: game, mapLocation: currentLocation };
                statusCallback({ error: false, data: handlerResp });
                return;
            }

            var characterDied = false;
            var playerDied = false;
            var playerWon = false;

            // The victor is the combatant that does the biggest %age damage to the opponent.
            var playerHealth = handlerResp.data.playerHealth;
            var characterHealth = handlerResp.data.characterHealth;
            var playerDamageDealt = Math.round(((characterOrigHealth - characterHealth) / characterOrigHealth) * 100);
            var characterDamageDealt = Math.round(((playerOrigHealth - playerHealth) / playerOrigHealth) * 100);

            console.log(
                "After fight. player.health: " + playerHealth +
                ", character.health: " + characterHealth +
                ", player dealt damage: " + playerDamageDealt + "% " +
                ", character dealt damage: " + characterDamageDealt + "%");

            message = "You fought valiantly.";
            if (characterHealth === 0 && playerHealth > 0) {
                message = `You fought valiantly. The ${character_type} died.`;
                characterDied = true;
                playerWon = true;
            } else if (characterHealth > 0 && playerHealth === 0) {
                message = "You fought valiantly, but you died.";
                playerDied = true;
            } else if (characterHealth === 0 && playerHealth === 0) {
                message = "You fought valiantly, but you both died.";
                characterDied = true;
                playerDied = true;
            } else {
                // Neither died. Judge the victor on who dealt the highest %age damage, or if damage
                // was equal, judge based on remaining strength.
                if ((playerDamageDealt > characterDamageDealt) ||
                    ((playerDamageDealt === characterDamageDealt) &&
                     (playerHealth > characterHealth))) {
                    message = "You fought valiantly and were victorious.";
                    playerWon = true;
                } else if ((characterDamageDealt > playerDamageDealt) ||
                           ((playerDamageDealt === characterDamageDealt) &&
                            (characterHealth > playerHealth))) {
                                message = `You fought valiantly but unfortunately the ${character_type} was victorious.`;
                } else {
                    // Evenly matched so far, declare a draw.
                    message = "You both fought valiantly, but are evently matched.";
                }
            }

            player.health = playerHealth;
            characterInfo.character.health = characterHealth;

            // Fight worked, so update the target.
            // Record who we took the object from so we can check for
            // "acquire from" objectives.
            if (playerWon) {
                foundInventoryItem.source = { reason: "take from", from: targetName };
                player.inventory.push(foundInventoryItem);
                characterInfo.character.inventory.splice(foundIndex, 1);
            }

            if (characterDied) {
                handleCharacterDeath(characterInfo.character, currentLocation);
                currentLocation.characters.splice(characterInfo.characterIndex, 1);
            }

            if (playerDied) {
                handlePlayerDeath(player, currentLocation);
            }

            var preamble = "";
            if (handlerResp.description.hasOwnProperty("message")) {
                preamble = handlerResp.description.message + " ";
            }
            notifyData = {
                playerName: player.name,
                description: {
                    action: "fight",
                    message: preamble + message
                },
                data: {
                    game: local_getGameData(),
                    mapLocation: copyData(currentLocation)
                }
            };

            statusCallback({ error: false, responseData: notifyData });
            return;
        });
}

function handleLevelUp(command, player, statusCallback) {
    // The initial parser expects the first token to be the command verb.
    // In this command it's the first two.. Check the 2nd word to be sure.
    if (command !== "level up") {
        statusCallback({ error: true, message: "Unknown command " + command });
        return;
    }

    console.log("LEVEL UP");

    var currentRealmIndex = g_gameData.realms.indexOf(g_currentRealmData._id);

    if (currentRealmIndex === g_gameData.realms.length - 1) {
        statusCallback({ error: true, message: "There are no more levels." });
        return;
    }

    // You can't level up unless you have completed all the objectives.
    if (!allObjectivesCompleted()) {
        displayMessageBlock("hmm, complete all objecitves you must");
        return;
    }

    player.location = { 'realm': g_gameData.realms[currentRealmIndex + 1] };

    // Add 1 to move up a level.
    // currentRealmIndex is 0-based so add another 1 for display purposes.
    var newLevel = currentRealmIndex + 2;

    handleSave(
        "save move to level " + newLevel,
        function () {
            notifyData = {
                playerName: player.name,
                description: {
                    action: "level up",
                    message: "move to level " + newLevel
                },
                data: {
                    'name': g_gameInfo.name,
                    'instance': g_gameInfo.maxGameInstance,
                    'maxInstance': g_gameInfo.maxGameInstance
                }
            };

            statusCallback({ error: false, responseData: notifyData });
        }
    );
}

function handleSave(command, statusCallback) {
    var instanceName = command.replace(/save[\s+]/i, "");

    console.log("SAVE: " + instanceName);
    createGameInstance(instanceName, function (err) {
        if (err) {
            return;
        }

        // Tell dbWrapper to open dbs from the new directory.
        var instancePath = path.join(g_gameInfo.gamePath, g_gameInfo.maxGameInstance.toString());
        console.log("new path " + instancePath);
        dbWrapper.openGameDB(function () {
            // Warning: NEDB does not support transactions. The code below assumes both updates work.
            saveGame(function (gameErr) {
                if (gameErr) {
                    console.log("in Game.update() callback, error. " + gameErr);
                    statusCallback({ error: true, message: gameErr });
                    return;
                }

                saveRealm(function (realmErr) {
                    if (gameErr) {
                        console.log("in realm.update() callback, error. " + realmErr);
                        statusCallback({ error: true, message: realmErr });
                        return;
                    }

                    notifyData = {
                        description: {
                            action: "save",
                            message: "saved successfully."
                        },
                        data: {
                            game: local_getGameData(),
                            realm: local_getCurrentRealmData()
                        }
                    };

                    statusCallback({ error: false, responseData: notifyData });
                    return;
                });
            });
        }, instancePath);
    });
}


// Create a new game subdir, numbered as maxInstance + 1.
// Create a metadata file containing the name, if specified.
// Make this the live game.
// The databases will be created as a separate step.
function createGameInstance(instanceName, gameCallback) {
    /*
    g_gameInfo = {
        'gamePath': gamePath,
        'gameInstance': instance,
        'maxGameInstance': maxInstance
    };
    */
    g_gameInfo.maxGameInstance++;

    const fs = require('fs');
    var newInstancePath = path.join(g_gameInfo.gamePath, g_gameInfo.maxGameInstance.toString());
    console.log("new path " + newInstancePath);

    // There are several steps in the instance creation process, which must happen
    // in sequence, despite some being asynchronous.
    async.waterfall([
        function (callback) {
            fs.access(newInstancePath, fs.constants.F_OK, function (err) {
                console.log(`${newInstancePath} ${err ? 'does not exist' : 'exists'}`);
                if (err) {
                    if (err.code === "ENOENT") {
                        // Good, we want it to not exist.
                        callback(null);
                    } else {
                        callback(err);
                    }
                } else {
                    callback(`Game ${newInstancePath} already exists.`);
                }
            });
        },
        function (callback) {
            fs.mkdir(newInstancePath, function (err) {
                if (err) {
                    alert("Error: " + JSON.stringify(err));
                }

                callback(err);
            });
        },
        function (callback) {
            function zeroPad(val) {
                return (val < 10 ? "0" + val.toString() : val.toString());
            }

            var today = new Date();
            var date = today.getFullYear() + '-' +
                zeroPad(today.getMonth() + 1) + '-' +
                zeroPad(today.getDate());
            var time = zeroPad(today.getHours()) + ":" +
                zeroPad(today.getMinutes()) + ":" +
                zeroPad(today.getSeconds());
            var dateTime = date + ' ' + time;

            var manifestData = {
                'name': instanceName,
                'saveDate': dateTime,
            };

            writeInstanceManifest(newInstancePath, manifestData);
            callback(null);
        },
        function (callback) {
            var currentInstancePath = path.join(g_gameInfo.gamePath, g_gameInfo.gameInstance.toString());
            fs.copyFile(path.join(currentInstancePath, "game.db"),
                path.join(newInstancePath, "game.db"),
                function (err) {
                    if (err) {
                        callback(err);
                    }

                    fs.copyFile(path.join(currentInstancePath, "questrealms.db"),
                        path.join(newInstancePath, "questrealms.db"),
                        function (err) {
                            callback(err);
                        });
                });
        }
    ],
    function (err) {
        // All done processing the games and realms, or aborted early with an error.
        if (err) {
            console.error("Failed to export game: " + err);
            alert("Failed to export game: " + err);
        }

        console.log("all done.");
        gameCallback(err);
    });
}

function checkObjectives(game, player, callback) {
    console.log("checkObjectives.");

    // Find the current location. Some objectives depend on it.
    var location = findLocation(player.location.x,
        player.location.y);
    if (!location) {
        console.error("in checkObjectives() invalid location.");
        return;
    }

    console.log("Objectives: " + JSON.stringify(g_currentRealmData.objectives));

    for (var i = 0; i < g_currentRealmData.objectives.length; i++) {
        // We need to keep track of the id for later on.
        var objective = { 'id': i, 'value': g_currentRealmData.objectives[i] };

        if (objective.value.completed === "true") {
            continue;
        }

        // Special handling for the "Start at" objective.
        if (objective.value.type === "Start at") {
            continue;
        }

        console.log("Evaluating objective " + i + ": " + JSON.stringify(objective));
        var handlerFunc = findHandler(objective.value, objective.value.type);

        console.log("calling " + objective.value.type + "() with game: " + JSON.stringify(g_gameData));
        handlerFunc(objective.value,
                    g_gameData,
                    g_currentRealmData,
                    player,
                    location,
                    function (handlerResp) {
            console.log("handlerResp: " + handlerResp);
            if (!handlerResp) {
                console.log("Objective not completed.");
                allcompleted = false;
                return;
            }

            console.log("Valid handlerResp: " + JSON.stringify(handlerResp));
            var id = objective.id;
            g_currentRealmData.objectives[id] = handlerResp.data.objective;

            // TODO: this is potentially a lot of data to send back.
            // Revisit this logic.
            handlerResp.data['realm'] = g_currentRealmData;

            // In a multiplayer game we'd want to broadcast a status update:
            /*
            console.log("*** sending resp: " + JSON.stringify(handlerResp));
            sails.io.sockets.emit(
                updatedRealm[0].id + "-status",
                handlerResp);
            */

            callback({ error: false, responseData: handlerResp });
            return;
        });
    }
}

function handleCommand(commandTokens, player, statusCallback) {
    var errorMessage = "Unknown comand";
    console.log(errorMessage);
    statusCallback({ error: true, message: errorMessage });
}
