/**
 * Handle game commands and database access.
 * (c) Simon Logan 2019
 */

const dbWrapper = require('../utils/dbWrapper');
const async = require('async');
const app = electron.remote.app;

var gameData;
var currentRealmData;

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
    // Initialize the game engine by loading the specfied game.
    // Params:
    //   dbPath - the location of the game db.
    //   loadCallback - a function to notify the caller when the game
    //                  has finished loading.
    initialize: function (dbPath, loadCallback) {
        async.waterfall([
            function (callback) {
                dbWrapper.openGameDB(callback, dbPath);
            },
            function (callback) {
                loadGame(callback);
            },
            function (callback) {
                // Initially assume the first realm. Later, we need to
                // load the current realm from the player data.
                loadRealm(gameData.realms[0], callback);
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
    setPlayerPrefs(prefs, callback) {
        if (prefs.hasOwnProperty("mapDrawMode")) {
            switch (prefs.mapDrawMode) {
                case mapDrawModeEnum.AUTO_ALL:
                case mapDrawModeEnum.AUTO_VISITED:
                case mapDrawModeEnum.MANUAL:
                    gameData.player.mapDrawMode = prefs.mapDrawMode;
                    saveGame(callback);
                    break;
                default:
                    callback("Unexpected draw choice value [" + prefs.mapDrawMode + "].");
            }
        }
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

        var playerName = gameData.player.name;

        // Split the comandline into whitespace-separated tokens. Remove the first and use
        // this as the command verb. The others are the args.
        var tokens = command.split(" ");
        var verb = tokens.shift();
        switch (verb) {
            // Pass the raw command to the handlers as they may need to split it
            // in command-specific ways.
            case "move":
                handleMove(command, playerName, function (handlerResult) {
                    console.log("in gameCommand. handleMove result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);
                    if (handlerResult.hasOwnProperty("data")) {
                        checkObjectives(handlerResult.data.data.game, playerName, function (objectiveResult) {
                            console.log("in gameCommand. checkObjectives result = " + JSON.stringify(objectiveResult));
                            callback(objectiveResult);
                        });
                    }
                });
                break;
            case "take":
                handleTake(command, playerName, function (handlerResult) {
                    console.log("in gameCommand. handleTake result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);
                    if (handlerResult.hasOwnProperty("data")) {
                        checkObjectives(handlerResult.data.data.game, playerName, function (objectiveResult) {
                            console.log("in gameCommand. checkObjectives result = " + JSON.stringify(objectiveResult));
                            callback(objectiveResult);
                        });
                    }
                });
                break;
            case "buy":
                handleBuy(command, playerName, function (handlerResult) {
                    console.log("in gameCommand. handleBuy result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);
                    if (handlerResult.hasOwnProperty("data")) {
                        checkObjectives(handlerResult.data.data.game, playerName, function (objectiveResult) {
                            console.log("in gameCommand. checkObjectives result = " + JSON.stringify(objectiveResult));
                            callback(objectiveResult);
                        });
                    }
                });
                break;
            case "drop":
                handleDrop(command, playerName, function (handlerResult) {
                    console.log("in gameCommand. handleDrop result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);
                    if (handlerResult.hasOwnProperty("data")) {
                        checkObjectives(handlerResult.data.data.game, playerName, function (objectiveResult) {
                            console.log("in gameCommand. checkObjectives result = " + JSON.stringify(objectiveResult));
                            callback(objectiveResult);
                        });
                    }
                });
                break;
            case "give":
                handleGive(command, playerName, function (handlerResult) {
                    console.log("in gameCommand. handleGive result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("data")) {
                        checkObjectives(handlerResult.data.data.game, playerName, function (objectiveResult) {
                            console.log("in gameCommand. checkObjectives result = " + JSON.stringify(objectiveResult));
                            callback(objectiveResult);
                        });
                    }
                });
                break;
            case "use":
                handleUse(command, playerName, function (handlerResult) {
                    console.log("in gameCommand. handleUse result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("data")) {
                        checkObjectives(handlerResult.data.data.game, playerName, function (objectiveResult) {
                            console.log("in gameCommand. checkObjectives result = " + JSON.stringify(objectiveResult));
                            callback(objectiveResult);
                        });
                    }
                });
                break;
            case "fight":
                handleFight(command, playerName, function (handlerResult) {
                    console.log("in gameCommand. handleFight result = " + JSON.stringify(handlerResult));
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("data")) {
                        checkObjectives(handlerResult.data.data.game, playerName, function (objectiveResult) {
                            console.log("in gameCommand. checkObjectives result = " + JSON.stringify(objectiveResult));
                            callback(objectiveResult);
                        });
                    }
                });
                break;
            default:
                handleCommand(command, playerName, function (handlerResult) {
                    console.log("in gameCommand. handleCommand result = " + handlerResult);
                    callback(handlerResult);

                    if (handlerResult.hasOwnProperty("data")) {
                        checkObjectives(handlerResult.data.data.game, playerName, function (objectiveResult) {
                            console.log("in gameCommand. checkObjectives result = " + JSON.stringify(objectiveResult));
                            callback(objectiveResult);
                        });
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

        gameData = data[0];
        callback(null);
    });
}

function loadRealm(realmId, callback) {
    console.log('gameEngine.loadRealm() ' + realmId);

    var db_collections = dbWrapper.getDBs();
    db_collections.questrealms.find({ _id: realmId }, function (err, data) {
        console.log("gameEngine.loadRealm found data: " + JSON.stringify(data));

        currentRealmData = data[0];
        callback(null);
    });
}

function local_getGameData() {
    // Return a copy of gameData;
    return JSON.parse(JSON.stringify(gameData));
}

function local_getCurrentRealmData() {
    return JSON.parse(JSON.stringify(currentRealmData));
}

function copyMapLocation(location) {
    return JSON.parse(JSON.stringify(location));
}

function saveGame(callback) {
    console.log(Date.now() + ' saveGame');

    var db_collections = dbWrapper.getDBs();
    db_collections.game.update({ _id: gameData._id }, gameData, {}, function (err, numReplaced) {
        console.log("saveGame err:" + err);
        console.log("saveGame numReplaced:" + numReplaced);
        callback(null);
    });
}

function saveRealm(callback) {
    console.log(Date.now() + ' saveRealm');

    var db_collections = dbWrapper.getDBs();
    db_collections.questrealms.update({ _id: currentRealmData._id }, currentRealmData, {}, function (err, numReplaced) {
        console.log("saveRealm err:" + err);
        console.log("saveRealm numReplaced:" + numReplaced);
        callback(null);
    });
}

// Consider using a backbone collection for the maplocations here.
// For now just filter the data directly.
function findLocation(x, y) {
    for (var i = 0; i < currentRealmData.mapLocations.length; i++) {
        if (currentRealmData.mapLocations[i].x === x &&
            currentRealmData.mapLocations[i].y === y) {
            return currentRealmData.mapLocations[i];
        }
    }

    return null;
}

function handleMove(command, playerName, statusCallback) {
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
    var playerInfo = findPlayer.findPlayerByName(gameData, playerName);
    if (null === playerInfo) {
        console.log("in handleMove.find() invalid player.");
        statusCallback({ error: true, message: "Invalid player" });
        return;
    }

    var originalX = parseInt(gameData.player.location.x);
    var originalY = parseInt(gameData.player.location.y);
    var newX = originalX + deltaX;
    var newY = originalY + deltaY;
    console.log("in handleMove.find() searching for location [" + newX + ", " + newY + "].");
    var newLocation = findLocation(newX.toString(), newY.toString());
    if (!newLocation) {
        var errorMessage = "Don't be daft, you'll fall off the end of the world!";
        console.log("new location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("in handleMove.find() callback " + JSON.stringify(newLocation));

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
            player: playerName,
            description: {
                action: "death",
                details: "You did not have enough health to move into that location."
            },
            data: {}
        };
    } else {
        game.players[playerInfo.playerIndex].health -= healthCost;
    */
    gameData.player.location.x = newX.toString();
    gameData.player.location.y = newY.toString();

    // Update the list of locations the player has visited.
    // This is a dictionary for quick searching. Using a list
    // will scale badly when drawing the whole map on the UI.
    var visitedKey = newX.toString() + "_" + newY.toString();
    var playerVistitedLocation = (visitedKey in gameData.player.visited[currentRealmData._id]);
    if (!playerVistitedLocation) {
        gameData.player.visited[currentRealmData._id][visitedKey] = true;
    }

    notifyData = {
        player: playerName,
        description: {
            action: "move",
            message: "You have moved to location [" + newX + "," + newY + "].",
            from: { x: originalX, y: originalY },
            to: { x: newX, y: newY }
        },
        data: {}
    };

    saveGame(function (err) {
        console.log("in Game.update() callback");
        if (err) {
            console.log("in Game.update() callback, error. " + err);
            statusCallback({ error: true, message: err });
            return;
        }

        console.log("in Game.update() callback, no error.");
        notifyData.data = { game: local_getGameData() };

        // In a multiplayer game, we need to broadcast the status update.
        //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
        //sails.io.sockets.emit(realmId + "-status", notifyData);

        statusCallback({ error: false, responseData: notifyData });
        return;
    });
    //});
}

function handleTake(command, playerName, statusCallback) {
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
    var playerInfo = findPlayer.findPlayerByName(gameData, playerName);
    if (null === playerInfo) {
        console.log("in handleTake.find() invalid player.");
        statusCallback({ error: true, message: "Invalid player" });
        return;
    }

    var currentX = gameData.player.location.x;
    var currentY = gameData.player.location.y;
    console.log("in handleTake.find() searching for location [" + currentX + ", " + currentY + "].");
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("in handleTake.find() callback " + JSON.stringify(currentLocation));

    if (!targetName) {
        handleTakeFromLocation(objectName, currentLocation, playerName, statusCallback);
    } else {
        handleTakeFromNPC(objectName, targetName, currentLocation, playerName, statusCallback);
    }
}

function handleTakeFromLocation(objectName, currentLocation, playerName, statusCallback) {
    console.log("In handleTakeFromLocation()");

    // Find the requested item in the current mapLocation.
    var itemInfo = findItem.findItemByType(currentLocation.items, objectName);
    if (itemInfo === null) {
        var errorMessage = "There is no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (undefined === gameData.player.inventory) {
        gameData.player.inventory = [];
    }

    gameData.player.inventory.push(itemInfo.item);
    currentLocation.items.splice(itemInfo.itemIndex, 1);

    notifyData = {
        player: playerName,
        description: {
            action: "take",
            message: "You have taken a " + itemInfo.item.type,
            item: itemInfo.item
        },
        data: {}
    };

    // Warning: NEDB does not support transactions. The code below assumes both updates work.
    saveGame(function (gameErr) {
        console.log("in Game.update() callback");
        if (gameErr) {
            console.log("in Game.update() callback, error. " + gameErr);
            statusCallback({ error: true, message: gameErr });
            return;
        }

        console.log("in Game.update() callback, no error.");

        saveRealm(function (realmErr) {
            console.log("in realm.update() callback");
            if (gameErr) {
                console.log("in realm.update() callback, error. " + realmErr);
                statusCallback({ error: true, message: realmErr });
                return;
            }

            console.log("in realm.update() callback, no error.");
            notifyData.data = {
                game: local_getGameData(),
                mapLocation: copyMapLocation(currentLocation)
            };

            // In a multiplayer game, we need to broadcast the status update.
            //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
            //sails.io.sockets.emit(realmId + "-status", notifyData);

            statusCallback({ error: false, responseData: notifyData });
            return;
        });
    });
}

function handleTakeFromNPC(objectName, targetName, currentLocation, playerName, statusCallback) {
    console.log("In handleTakeFromNPC()");

    // Find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Found targetName: " + JSON.stringify(targetName));

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Checking inventory");
    var foundIndex = -1;
    var foundInventoryItem = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
        if (characterInfo.character.inventory[j].type === objectName) {
            foundIndex = j;
            foundInventoryItem = characterInfo.character.inventory[foundIndex];
            console.log("Found item in inventory");
        }
    }

    if (foundIndex === -1) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Found objectName: " + JSON.stringify(foundInventoryItem));
    console.log("characterIndex: " + characterInfo.characterIndex);

    // We found the item. See if we can take it.
    var path = require('path');
    var gameDir = path.join(app.getPath('userData'), "games", gameData.name);
    console.log("gameDir: " + gameDir);
    var handlerPath = path.join(gameDir, "modules", characterInfo.character.module, characterInfo.character.filename);
    console.log("HandlerPath: " + handlerPath);
    var module = require(handlerPath);

    // Command handlers are optional.
    if (module.handlers === undefined) {
        console.log("1 Module: " + handlerPath +
            " does not have a handler for \"take from\".");
        statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
        return;
    }

    var handlerFunc = module.handlers["take from"];
    if (handlerFunc === undefined) {
        console.log("2 Module: " + handlerPath +
            " does not have a handler for \"take from\".");
        statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
        return;
    }

    console.log("calling take from()");
    handlerFunc(characterInfo.character, foundInventoryItem, gameData, playerName, function (handlerResp) {
        console.log("handlerResp: " + handlerResp);
        if (!handlerResp) {
            console.log("1 Take from failed - null handlerResp");
            statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
            return;
        }

        console.log("Valid handlerResp " + JSON.stringify(handlerResp));
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

        if (gameData.player.inventory === undefined) {
            gameData.player.inventory = [];
        }
        gameData.player.inventory.push(foundInventoryItem);

        notifyData = {
            player: playerName,
            description: {
                action: "take",
                message: "You have taken a " + objectName + " from the " + targetName,
                item: itemInfo.item
            },
            data: {}
        };

        // Warning: NEDB does not support transactions. The code below assumes both updates work.
        saveGame(function (gameErr) {
            console.log("in Game.update() callback");
            if (gameErr) {
                console.log("in Game.update() callback, error. " + gameErr);
                statusCallback({ error: true, message: gameErr });
                return;
            }

            console.log("in Game.update() callback, no error.");

            saveRealm(function (realmErr) {
                console.log("in realm.update() callback");
                if (gameErr) {
                    console.log("in realm.update() callback, error. " + realmErr);
                    statusCallback({ error: true, message: realmErr });
                    return;
                }

                console.log("in realm.update() callback, no error.");
                notifyData.data = {
                    game: local_getGameData(),
                    mapLocation: copyMapLocation(currentLocation)
                };

                // In a multiplayer game, we need to broadcast the status update.
                //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
                //sails.io.sockets.emit(realmId + "-status", notifyData);

                statusCallback({ error: false, responseData: notifyData });
                return;
            });
        });
    });
}

function handleBuy(command, playerName, statusCallback) {
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
    var playerInfo = findPlayer.findPlayerByName(gameData, playerName);
    if (null === playerInfo) {
        console.log("in handleBuy.find() invalid player.");
        statusCallback({ error: true, message: "Invalid player" });
        return;
    }

    var currentX = gameData.player.location.x;
    var currentY = gameData.player.location.y;
    console.log("in handleBuy.find() searching for location [" + currentX + ", " + currentY + "].");
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("in handleBuy.find() callback " + JSON.stringify(currentLocation));

    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    handleBuyFromNPC(objectName, targetName, currentLocation, playerName, playerInfo.playerIndex, statusCallback);
}

function handleBuyFromNPC(objectName, targetName, currentLocation, playerName, playerIndex, statusCallback) {
    console.log("In handleBuyFromNPC()");

    // Find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Found targetName: " + JSON.stringify(targetName));

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Checking inventory");
    var foundIndex = -1;
    var foundInventoryItem = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
        console.log("Checking inventory item " + j.toString());
        if (characterInfo.character.inventory[j].type === objectName) {
            // Assume the buy will be successful. If not, we will
            // discard this edit.
            foundIndex = j;
            foundInventoryItem = characterInfo.character.inventory[foundIndex];
            console.log("Found item in inventory");
            break;
        }
    }

    console.log("After checking inventory");
    if (foundIndex === -1) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Found objectName: " + JSON.stringify(foundInventoryItem));
    console.log("characterIndex: " + characterInfo.characterIndex);

    // We found the item. See if we can buy it.
    var path = require('path');
    var gameDir = path.join(app.getPath('userData'), "games", gameData.name);
    console.log("gameDir: " + gameDir);
    var handlerPath = path.join(gameDir, "modules", characterInfo.character.module, characterInfo.character.filename);
    console.log("HandlerPath: " + handlerPath);
    var module = require(handlerPath);

    // Command handlers are optional.
    if (module.handlers === undefined) {
        console.log("1 Module: " + handlerPath +
            " does not have a handler for \"buy from\".");
        statusCallback({ error: true, message: "The " + targetName + " won't sell you the " + objectName });
        return;
    }

    var handlerFunc = module.handlers["buy from"];
    if (handlerFunc === undefined) {
        console.log("2 Module: " + handlerPath +
            " does not have a handler for \"buy from\".");
        statusCallback({ error: true, message: "The " + targetName + " won't sell you the " + objectName });
        return;
    }

    console.log("calling buy from()");
    // TODO: pass copies of characterInfo, object, and gameData
    handlerFunc(characterInfo.character, foundInventoryItem, gameData, playerName, function (handlerResp) {
        console.log("handlerResp: " + handlerResp);
        if (!handlerResp) {
            console.log("1 Buy from failed - null handlerResp");
            statusCallback({ error: true, message: "The " + targetName + " won't sell you the " + objectName });
            return;
        }

        console.log("Valid handlerResp " + JSON.stringify(handlerResp));
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
        
        if (gameData.player.inventory === undefined) {
            gameData.player.inventory = [];
        }
        gameData.player.inventory.push(foundInventoryItem);

        //  Now pay!
        if (handlerResp.data && handlerResp.data.payment && handlerResp.data.payment.type) {
            for (var i = 0; i < gameData.player.inventory.length; i++) {
                if (gameData.player.inventory[i].type === handlerResp.data.payment.type) {
                    // could use characterInfo.character instead of currentLocation.characters[characterInfo.characterIndex]
                    currentLocation.characters[characterInfo.characterIndex].inventory.push(gameData.player.inventory[i]);
                    gameData.player.inventory.splice(i, 1);
                    break;
                }
            }
        }

        notifyData = {
            player: playerName,
            description: {
                action: "buy",
                message: "You have bought a " + objectName + " from the " + targetName,
                item: itemInfo.item
            },
            data: {}
        };

        // Warning: NEDB does not support transactions. The code below assumes both updates work.
        saveGame(function (gameErr) {
            console.log("in Game.update() callback");
            if (gameErr) {
                console.log("in Game.update() callback, error. " + gameErr);
                statusCallback({ error: true, message: gameErr });
                return;
            }

            console.log("in Game.update() callback, no error.");

            saveRealm(function (realmErr) {
                console.log("in realm.update() callback");
                if (gameErr) {
                    console.log("in realm.update() callback, error. " + realmErr);
                    statusCallback({ error: true, message: realmErr });
                    return;
                }

                console.log("in realm.update() callback, no error.");
                notifyData.data = {
                    game: local_getGameData(),
                    mapLocation: copyMapLocation(currentLocation)
                };

                // In a multiplayer game, we need to broadcast the status update.
                //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
                //sails.io.sockets.emit(realmId + "-status", notifyData);

                statusCallback({ error: false, responseData: notifyData });
                return;
            });
        });
    });
}

function handleDrop(command, playerName, statusCallback) {
    var target = command.replace(/drop[\s+]/i, "");

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    console.log("DROP: " + target);

    // Get the current player location.
    var playerInfo = findPlayer.findPlayerByName(gameData, playerName);
    if (null === playerInfo) {
        console.log("in handleDrop.find() invalid player.");
        statusCallback({ error: true, message: "Invalid player" });
        return;
    }

    var currentX = gameData.player.location.x;
    var currentY = gameData.player.location.y;
    console.log("in handleDrop.find() searching for location [" + currentX + ", " + currentY + "].");
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("in handleDrop.find() callback " + JSON.stringify(currentLocation));

    // Find the requested item in the inventory.
    var foundIndex = -1;
    for (var i = 0; i < playerInfo.player.inventory.length; i++) {
        // TODO: handle ambiguous object descriptions (e.g. "drop sword" when there are two swords).
        if (playerInfo.player.inventory[i].type !== target) {
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
    var item = playerInfo.player.inventory[i];
    if (undefined === currentLocation.items) {
        currentLocation.items = [];
    }

    currentLocation.items.push(item);
    playerInfo.player.inventory.splice(i, 1);

    if (playerInfo.player.using && _.isEqual(playerInfo.player.using, item)) {
        playerInfo.player.using = [];
    }

    gameData.player = playerInfo.player;

    notifyData = {
        player: playerName,
        description: {
            action: "drop",
            message: "You have dropped a " + item.type,
            item: item,
        },
        data: {}
    };

    // Warning: NEDB does not support transactions. The code below assumes both updates work.
    saveGame(function (gameErr) {
        console.log("in Game.update() callback");
        if (gameErr) {
            console.log("in Game.update() callback, error. " + gameErr);
            statusCallback({ error: true, message: gameErr });
            return;
        }

        console.log("in Game.update() callback, no error.");

        saveRealm(function (realmErr) {
            console.log("in realm.update() callback");
            if (gameErr) {
                console.log("in realm.update() callback, error. " + realmErr);
                statusCallback({ error: true, message: realmErr });
                return;
            }

            console.log("in realm.update() callback, no error.");
            notifyData.data = {
                game: local_getGameData(),
                mapLocation: copyMapLocation(currentLocation)
            };

            // In a multiplayer game, we need to broadcast the status update.
            //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
            //sails.io.sockets.emit(realmId + "-status", notifyData);

            statusCallback({ error: false, responseData: notifyData });
            return;
        });
    });
}

function handleGive(command, playerName, statusCallback) {
    command = command.replace(/give[\s+]/i, "");
    var commandArgs = command.split("to");
    var objectName = commandArgs[0].trim();

    console.log("GIVE: " + objectName);
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
    var playerInfo = findPlayer.findPlayerByName(gameData, playerName);
    if (null === playerInfo) {
        console.log("in handleGive.find() invalid player.");
        statusCallback({ error: true, message: "Invalid player" });
        return;
    }

    var currentX = gameData.player.location.x;
    var currentY = gameData.player.location.y;
    console.log("in handleGive.find() searching for location [" + currentX + ", " + currentY + "].");
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("in handleGive.find() callback " + JSON.stringify(currentLocation));

    handleGiveToNPC(objectName, targetName, currentLocation, playerInfo, statusCallback);
}

function handleGiveToNPC(objectName, targetName, currentLocation, playerInfo, statusCallback) {
    console.log("In handleGiveToNPC()");

    // Find the requested item in the specified target's inventory.
    if (playerInfo.player.inventory === undefined) {
        var errorMessage = "You do not have an " + objectName;
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    var object = null;
    for (var i = 0; i < playerInfo.player.inventory.length; i++) {
        // TODO: handle ambiguous object descriptions (e.g. "give sword..." when there are two swords).
        if (playerInfo.player.inventory[i].type === objectName) {
            // Update the player inventory now. If the give operation fails we
            // won't save this change.
            object = playerInfo.player.inventory[i];
            playerInfo.player.inventory.splice(i, 1);
            break;
        }
    }

    if (object === null) {
        var errorMessage = "You do not have an " + objectName;
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Found object: " + JSON.stringify(object));

    // Found the item, now find the recipient.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Found recipient: " + JSON.stringify(targetName));

    var path = require('path');
    var gameDir = path.join(app.getPath('userData'), "games", gameData.name);
    console.log("gameDir: " + gameDir);
    var handlerPath = path.join(gameDir, "modules", characterInfo.character.module, characterInfo.character.filename);
    console.log("HandlerPath: " + handlerPath);
    var module = require(handlerPath);

    // Command handlers are optional.
    if (module.handlers === undefined) {
        console.log("Module: " + handlerPath +
            " does not have a handler for \"give\".");
        statusCallback({ error: true, message: "You can't give an " + objectName + " to the " + targetName });
        return;
    }

    var handlerFunc = module.handlers["give"];
    if (handlerFunc === undefined) {
        console.log("Module: " + handlerPath +
            " does not have a handler for \"give\".");
        statusCallback({ error: true, message: "You can't give an " + objectName + " to the " + targetName });
        return;
    }

    console.log("calling give()");
    handlerFunc(targetName, object, gameData, playerName, function (handlerResp) {
        console.log("handlerResp: " + handlerResp);
        if (!handlerResp) {
            console.log("Give failed - null handlerResp");
            statusCallback({ error: true, message: "Failed to give an " + objectName + " to the " + targetName });
            return;
        }

        console.log("Valid handlerResp " + JSON.stringify(handlerResp));
        if (!handlerResp.description.success) {
            console.log("Give failed: " + handlerResp.description.message);
            statusCallback({ error: true, message: handlerResp.description.message });
            return;
        }

        var usingItemInfo = findItem.findItemByType(playerInfo.player.using, objectName);
        if (usingItemInfo) {
            // You are using that item. Not any more...
            playerInfo.player.using.splice(usingItemInfo.itemIndex, 1);
        }

        // Give worked, so update the recipient.
        // Record who gave the object so we can check for "give" objectives.
        object.source = { reason: "give", from: playerName };

        if (characterInfo.character.inventory === undefined) {
            characterInfo.character.inventory = [];
        }
        characterInfo.character.inventory.push(object);

        notifyData = {
            player: playerInfo.player.name,
            description: {
                action: "take",
                message: "You have given a " + objectName + " to the " + targetName,
                item: itemInfo.item
            },
            data: {}
        };

        // Warning: NEDB does not support transactions. The code below assumes both updates work.
        saveGame(function (gameErr) {
            console.log("in Game.update() callback");
            if (gameErr) {
                console.log("in Game.update() callback, error. " + gameErr);
                statusCallback({ error: true, message: gameErr });
                return;
            }

            console.log("in Game.update() callback, no error.");

            saveRealm(function (realmErr) {
                console.log("in realm.update() callback");
                if (gameErr) {
                    console.log("in realm.update() callback, error. " + realmErr);
                    statusCallback({ error: true, message: realmErr });
                    return;
                }

                console.log("in realm.update() callback, no error.");
                notifyData.data = {
                    game: local_getGameData(),
                    mapLocation: copyMapLocation(currentLocation)
                };

                // In a multiplayer game, we need to broadcast the status update.
                //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
                //sails.io.sockets.emit(realmId + "-status", notifyData);

                statusCallback({ error: false, responseData: notifyData });
                return;
            });
        });
    });
}

function handleUse(command, playerName, statusCallback) {
    commandArgs = command.replace(/use[\s+]/i, "");

    console.log("Use: " + JSON.stringify(commandArgs));

    // TODO: for now target is the item type (i.e. "sword", not "the sword of destiny").
    // This means it must be specific: "short sword" rather than "sword".
    var objectName = commandArgs.trim();

    var playerInfo = findPlayer.findPlayerByName(gameData, playerName);
    if (null === playerInfo) {
        console.log("in handleUse.find() invalid player.");
        statusCallback({ error: true, message: "Invalid player" });
        return;
    }

    // Find the requested item in the inventory.
    var item = null;
    for (var i = 0; i < playerInfo.player.inventory.length; i++) {
        // TODO: handle ambiguous object descriptions (e.g. "use sword" when there are two swords).
        if (playerInfo.player.inventory[i].type !== objectName) {
            continue;
        }

        item = playerInfo.player.inventory[i];
        break;
    }

    if (!item) {
        var errorMessage = "You do not have a " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    playerInfo.player.using = [];
    playerInfo.player.using.push(item);

    // Warning: NEDB does not support transactions. The code below assumes both updates work.
    saveGame(function (gameErr) {
        console.log("in Game.update() callback");
        if (gameErr) {
            console.log("in Game.update() callback, error. " + gameErr);
            statusCallback({ error: true, message: gameErr });
            return;
        }

        console.log("in Game.update() callback, no error.");

        notifyData = {
            player: playerName,
            description: {
                action: "use",
                message: "You are using the " + item.type,
                item: itemInfo.item
            },
            data: {
                game: local_getGameData()
            }
        };

        // In a multiplayer game, we need to broadcast the status update.
        //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
        //sails.io.sockets.emit(realmId + "-status", notifyData);

        statusCallback({ error: false, responseData: notifyData });
        return;
    });
}

function handleFight(command, playerName, statusCallback) {
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
    var playerInfo = findPlayer.findPlayerByName(gameData, playerName);
    if (null === playerInfo) {
        console.log("in handleFight.find() invalid player.");
        statusCallback({ error: true, message: "Invalid player" });
        return;
    }

    var currentX = gameData.player.location.x;
    var currentY = gameData.player.location.y;
    console.log("in handleFight.find() searching for location [" + currentX + ", " + currentY + "].");
    var currentLocation = findLocation(currentX, currentY);
    if (!currentLocation) {
        var errorMessage = "Current location not found";
        console.log("Current location not found");
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    if (objectName === null) {
        handleFightNPC(targetName, currentLocation, playerInfo, statusCallback);
    } else {
        handleFightNPCforItem(targetName, objectName, currentLocation, playerInfo, statusCallback);
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

function handleCharacterDefeat(character, currentLocation) {
    // The character will drop its inventory.
    if (character.inventory !== undefined) {
        for (var i = 0; i < character.inventory.length; i++) {
            currentLocation.items.push(character.inventory[i]);
        }
    }

    character.inventory = [];
}

function handlePlayerDefeat(player, currentLocation) {
    // You will drop your inventory.
    for (var i = 0; i < player.inventory.length; i++) {
        currentLocation.items.push(player.inventory[i]);
    }

    player.inventory = [];
}

// Fight with no particular objective in mind.
function handleFightNPC(targetName, currentLocation, playerInfo, statusCallback) {
    console.log("In handleFightNPC()");

    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Found targetName: " + JSON.stringify(targetName));

    var path = require('path');
    var gameDir = path.join(app.getPath('userData'), "games", gameData.name);
    console.log("gameDir: " + gameDir);

    // Perform the default fight operation and call the optional handler to modify the
    // NPC's behaviour.
    var tryHandlers = [
        path.join(gameDir, "modules", characterInfo.character.module, characterInfo.character.filename),
        path.join(gameDir, "modules", "default", "default-handlers.js")
    ];

    for (var i = 0; i < tryHandlers.length; i++) {
        var handlerPath = tryHandlers[i];
        console.log("tryhandlers[" + i + "] = " + handlerPath);
        try {
            module = require(handlerPath);
        } catch (err) {
            sails.log.error(JSON.stringify(err));
            continue;
        }

        if (module.handlers !== undefined && module.handlers["fight"] !== undefined) {
            handlerFunc = module.handlers["fight"];
            console.log("found fight handler");
            break;
        } else {
            console.log("1 Module: " + handlerPath +
                " does not have a handler for \"fight\".");
        }
    }

    if (!handlerFunc) {
        console.log("There is no handler for \"fight\" available.");
        statusCallback({ error: true, message: "There is no handler for \"fight\" available" });
        return;
    }

    console.log("calling fight()");

    // For string template substitution.
    var template = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v]);

    // Note on the format/message split below. If we ever wish to localise the strings,
    // "You are too weak to fight. The ${character_type} was victorious." is much better
    // for translators as there is a full sentence to work with, and the embedded named
    // token gives info about what data it contains. Compare this to the much worse
    // translate("You are too weak to fight. The ") + character.type + translate(" was victorious.");

    console.log(
        "Before fight. player.health: " + playerInfo.player.health +
        ", player.damage: " + playerInfo.player.damage +
        ", character.health: " + characterInfo.character.health +
        ", character damage: " + characterInfo.character.damage);

    // The player can't fight if health is 0.
    if (playerInfo.player.health === 0) {
        var format = "You are too weak to fight. The ${character_type} was victorious.";
        var message = template(format, { character_type: characterInfo.character.type });
        var notifyData = {
            player: playerInfo.player.name,
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
    var playerOrigHealth = playerInfo.player.health;
    handlerFunc(characterInfo.character, gameData, playerInfo, function (handlerResp) {
        console.log("handlerResp: " + handlerResp);
        if (!handlerResp) {
            console.log("1 fight - null handlerResp");
            statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
            return;
        }

        console.log("Valid handlerResp " + JSON.stringify(handlerResp));
        if (!handlerResp.description.success) {
            console.log("2 fight failed: " + handlerResp.description.message);
            statusCallback({ error: true, message: handlerResp.description.message });
            return;
        }

        // Don't update the game if there was no response from the handler.
        if (!handlerResp.hasOwnProperty('data')) {
            console.log("*** 1 sending resp: " + JSON.stringify(handlerResp));
            handlerResp.data = { game: game, location: currentLocation };
            //sails.io.sockets.emit(game.id + "-status", handlerResp);
            statusCallback({ error: false, data: handlerResp });
            return;
        }

        // In "fight" your opponent can die.
        // In "fight for" they can be totally defeated but will not die.
        var characterDied = false;
        var playerTotallyDefeated = false;
        var playerWon = false;

        // The victor is the combatant that does the biggest %age damage to the opponent.
        var playerHealth = handlerResp.data.playerHealth;
        var characterHealth = handlerResp.data.characterHealth;
        var playerDamageDealt = Math.round((playerInfo.player.damage / characterOrigHealth) * 100);
        var characterDamageDealt = Math.round((characterInfo.character.damage / playerOrigHealth) * 100);

        console.log(
            "After fight. player.health: " + playerHealth +
            ", character.health: " + characterHealth +
            ", player dealt damage: " + playerDamageDealt + "% " +
            ", character dealt damage: " + characterDamageDealt + "%");

        message = "You fought valiantly.";
        if (characterHealth === 0 && playerHealth > 0) {
            format = "You fought valiantly. The ${character_type} died.";
            characterDied = true;
            message = template(format, { character_type: characterInfo.character.type });
            playerWon = true;
        } else if (characterHealth > 0 && playerHealth === 0) {
            message = "You fought valiantly, but you were totally defeated.";
            playerTotallyDefeated = true;
        } else if (characterHealth === 0 && playerHealth === 0) {
            message = "You fought valiantly, but the ${character_type} died and you were totally defeated.";
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
                format = "You fought valiantly but unfortunately the ${character_type} was victorious.";
                message = template(format, { character_type: characterInfo.character.type });
            } else {
                // Evenly matched so far, declare a draw.
                message = "You both fought valiantly, but are evently matched.";
            }
        }

        gameData.player.health = playerHealth;
        characterInfo.character.health = characterHealth;

        if (characterDied) {
            handleCharacterDeath(characterInfo.character, currentLocation);
            currentLocation.characters.splice(characterInfo.characterIndex, 1);
        }

        if (playerTotallyDefeated) {
            handlePlayerDefeat(playerInfo.player, currentLocation);
        }

        notifyData = {
            player: playerInfo.player.name,
            description: {
                action: "fight",
                message: message
            },
            data: {}
        };

        // Warning: NEDB does not support transactions. The code below assumes both updates work.
        saveGame(function (gameErr) {
            console.log("in Game.update() callback");
            if (gameErr) {
                console.log("in Game.update() callback, error. " + gameErr);
                statusCallback({ error: true, message: gameErr });
                return;
            }

            console.log("in Game.update() callback, no error.");

            saveRealm(function (realmErr) {
                console.log("in realm.update() callback");
                if (gameErr) {
                    console.log("in realm.update() callback, error. " + realmErr);
                    statusCallback({ error: true, message: realmErr });
                    return;
                }

                console.log("in realm.update() callback, no error.");
                notifyData.data = {
                    game: local_getGameData(),
                    mapLocation: copyMapLocation(currentLocation)
                };

                // In a multiplayer game, we need to broadcast the status update.
                //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
                //sails.io.sockets.emit(realmId + "-status", notifyData);

                statusCallback({ error: false, responseData: notifyData });
                return;
            });
        });
    });
}

// Fight until you beat the NPC and take the object
function handleFightNPCforItem(targetName, objectName, currentLocation, playerInfo, statusCallback) {
    console.log("In handleFightNPCforItem()");

    // If fighting for an object, find the requested item in the specified target's inventory.
    var characterInfo = findCharacter.findLocationCharacterByType(currentLocation, targetName);
    if (null === characterInfo) {
        var errorMessage = "There is no " + targetName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Found targetName: " + JSON.stringify(targetName));

    if (characterInfo.character.inventory === undefined) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    console.log("Checking inventory");
    var itemFound = false;
    var object = null;
    for (var j = 0; j < characterInfo.character.inventory.length; j++) {
        if (characterInfo.character.inventory[j].type === objectName) {
            itemFound = true;
            object = characterInfo.character.inventory[j];
            characterInfo.character.inventory.splice(j, 1);
            console.log("Found item in inventory");
        }
    }

    if (!itemFound) {
        var errorMessage = "The " + targetName + " has no " + objectName + ".";
        console.log(errorMessage);
        statusCallback({ error: true, message: errorMessage });
        return;
    }

    var path = require('path');
    var gameDir = path.join(app.getPath('userData'), "games", gameData.name);
    console.log("gameDir: " + gameDir);

    // Perform the default fight operation and call the optional handler to modify the
    // NPC's behaviour.
    var tryHandlers = [
        path.join(gameDir, "modules", characterInfo.character.module, characterInfo.character.filename),
        path.join(gameDir, "modules", "default", "default-handlers.js")
    ];

    for (var i = 0; i < tryHandlers.length; i++) {
        var handlerPath = tryHandlers[i];
        console.log("tryhandlers[" + i + "] = " + handlerPath);
        try {
            module = require(handlerPath);
        } catch (err) {
            sails.log.error(JSON.stringify(err));
            continue;
        }

        if (module.handlers !== undefined && module.handlers["fight for"] !== undefined) {
            handlerFunc = module.handlers["fight for"];
            console.log("found fight handler");
            break;
        } else {
            console.log("1 Module: " + handlerPath +
                " does not have a handler for \"fight for\".");
        }
    }

    if (!handlerFunc) {
        console.log("There is no handler for \"fight for\" available.");
        statusCallback({ error: true, message: "There is no handler for \"fight for\" available" });
        return;
    }

    console.log("calling fight for()");

    // For string template substitution.
    var template = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v]);

    // Note on the format/message split below. If we ever wish to localise the strings,
    // "You are too weak to fight. The ${character_type} was victorious." is much better
    // for translators as there is a full sentence to work with, and the embedded named
    // token gives info about what data it contains. Compare this to the much worse
    // translate("You are too weak to fight. The ") + character.type + translate(" was victorious.");

    console.log(
        "Before fight. player.health: " + playerInfo.player.health +
        ", player.damage: " + playerInfo.player.damage +
        ", character.health: " + characterInfo.character.health +
        ", character damage: " + characterInfo.character.damage);

    // The player can't fight if health is 0.
    if (playerInfo.player.health === 0) {
        var format = "You are too weak to fight. The ${character_type} was victorious.";
        var message = template(format, { character_type: characterInfo.character.type });
        var notifyData = {
            player: playerInfo.player.name,
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
    var playerOrigHealth = playerInfo.player.health;
    handlerFunc(characterInfo.character, object, gameData, playerInfo, function (handlerResp) {
        console.log("handlerResp: " + handlerResp);
        if (!handlerResp) {
            console.log("1 fight for - null handlerResp");
            statusCallback({ error: true, message: "The " + targetName + " won't give you the " + objectName });
            return;
        }

        console.log("Valid handlerResp " + JSON.stringify(handlerResp));
        if (!handlerResp.description.success) {
            console.log("2 fight for failed: " + handlerResp.description.message);
            statusCallback({ error: true, message: handlerResp.description.message });
            return;
        }

        // Don't update the game if there was no response from the handler.
        if (!handlerResp.hasOwnProperty('data')) {
            console.log("*** 1 sending resp: " + JSON.stringify(handlerResp));
            handlerResp.data = { game: game, location: currentLocation };
            //sails.io.sockets.emit(game.id + "-status", handlerResp);
            statusCallback({ error: false, data: handlerResp });
            return;
        }

        // In "fight" your opponent can die.
        // In "fight for" they can be totally defeated but will not die.
        var characterTotallyDefeated = false;
        var playerTotallyDefeated = false;
        var playerWon = false;

        // The victor is the combatant that does the biggest %age damage to the opponent.
        var playerHealth = handlerResp.data.playerHealth;
        var characterHealth = handlerResp.data.characterHealth;
        var playerDamageDealt = Math.round((playerInfo.player.damage / characterOrigHealth) * 100);
        var characterDamageDealt = Math.round((characterInfo.character.damage / playerOrigHealth) * 100);

        console.log(
            "After fight. player.health: " + playerHealth +
            ", character.health: " + characterHealth +
            ", player dealt damage: " + playerDamageDealt + "% " +
            ", character dealt damage: " + characterDamageDealt + "%");

        message = "You fought valiantly.";
        if (characterHealth === 0 && playerHealth > 0) {
            format = "You fought valiantly. The ${character_type} was totally defeated.";
            characterTotallyDefeated = true;
            message = template(format, { character_type: characterInfo.character.type });
            playerWon = true;
        } else if (characterHealth > 0 && playerHealth === 0) {
            message = "You fought valiantly, but you were totally defeated.";
            playerDied = true;
        } else if (characterHealth === 0 && playerHealth === 0) {
            message = "You fought valiantly, but you were both totally defeated.";
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
                format = "You fought valiantly but unfortunately the ${character_type} was victorious.";
                message = template(format, { character_type: characterInfo.character.type });
            } else {
                // Evenly matched so far, declare a draw.
                message = "You both fought valiantly, but are evently matched.";
            }
        }

        gameData.player.health = playerHealth;
        characterInfo.character.health = characterHealth;
        
        // Fight worked, so update the target.
        if (characterTotallyDefeated) {
            handleCharacterDefeat(characterInfo.character, currentLocation);
        }

        if (playerTotallyDefeated) {
            handlePlayerDefeat(playerInfo.player, currentLocation);
        }

        // Record who we took the object from so we can check for
        // "acquire from" objectives.
        if (playerWon) {
            object.source = { reason: "take from", from: targetName };
            gameData.player.inventory.push(object);
        }

        notifyData = {
            player: playerInfo.player.name,
            description: {
                action: "fight",
                message: message
            },
            data: {}
        };

        // Warning: NEDB does not support transactions. The code below assumes both updates work.
        saveGame(function (gameErr) {
            console.log("in Game.update() callback");
            if (gameErr) {
                console.log("in Game.update() callback, error. " + gameErr);
                statusCallback({ error: true, message: gameErr });
                return;
            }

            console.log("in Game.update() callback, no error.");

            saveRealm(function (realmErr) {
                console.log("in realm.update() callback");
                if (gameErr) {
                    console.log("in realm.update() callback, error. " + realmErr);
                    statusCallback({ error: true, message: realmErr });
                    return;
                }

                console.log("in realm.update() callback, no error.");
                notifyData.data = {
                    game: local_getGameData(),
                    mapLocation: copyMapLocation(currentLocation)
                };

                // In a multiplayer game, we need to broadcast the status update.
                //console.log("sending socket messages for subject '" + currentRealmData._id + "-status'");
                //sails.io.sockets.emit(realmId + "-status", notifyData);

                statusCallback({ error: false, responseData: notifyData });
                return;
            });
        });
    });
}

function checkObjectives(game, playerName, callback) {
    console.log("checkObjectives.");

    var playerInfo = findPlayer.findPlayerByName(game, playerName);
    if (null === playerInfo) {
        console.log("in handleUse.find() invalid player.");
        callback({ error: true, message: "Invalid player" });
        return;
    }

    console.log("Objectives: " + JSON.stringify(currentRealmData.objectives));

    for (var i = 0; i < currentRealmData.objectives.length; i++) {
        if (currentRealmData.objectives[i].completed === "true") {
            continue;
        }

        // Special handling for the "Start at" objective.
        if (currentRealmData.objectives[i].type === "Start at") {
            continue;
        }

        var objective = currentRealmData.objectives[i];
        console.log("Evaluating objective " + i + ": " + JSON.stringify(objective));
        var path = require('path');
        var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
        var handlerPath = pathroot + objective.module + "/" + objective.filename;
        var module = require(handlerPath);
        var handlerFunc = module.handlers[objective.type];
        if (handlerFunc === undefined) {
            console.log("Module: " + handlerPath +
                " does not have a handler for \"" +
                objective.type + "\".");
            continue;
        }

        console.log("Found handlerPath:" + handlerPath);
        console.log("calling " + objective.type + "() with game: " + JSON.stringify(gameData));
        handlerFunc(objective, gameData, currentRealmData, playerName, function (handlerResp) {
            console.log("handlerResp: " + handlerResp);
            if (!handlerResp) {
                console.log("Invalid handler response.");
                callback({ error: true, message: "Invalid handler response" });
                return;
            }

            console.log("Valid handlerResp: " + JSON.stringify(handlerResp));
            var id = handlerResp.data.objective.id;
            currentRealmData.objectives[id] = handlerResp.data.objective;

            saveRealm(function (err) {
                if (err) {
                    console.log("Failed to update the db.");
                    callback({ error: true, message: "Failed to update the db" });
                    return;
                }

                console.log("checkObjectives() QuestRealm.update() callback " + JSON.stringify(updatedRealm));
                handlerResp.data['realm'] = updatedRealm;

                // In a multiplayer game we'd want to broadcast a status update:
                /*
                console.log("*** sending resp: " + JSON.stringify(handlerResp));
                sails.io.sockets.emit(
                   updatedRealm[0].id + "-status",
                   handlerResp);
                */

                callback({ error: false, data: handlerResp });
                return;
            });
        });
    }
}

function handleCommand(commandTokens, playerName, statusCallback) {
    var errorMessage = "Unknown comand";
    console.log(errorMessage);
    statusCallback({ error: true, message: errorMessage });
}
