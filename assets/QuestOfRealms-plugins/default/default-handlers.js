/**
 * Created by Simon on 16/04/2017.
 * Implement default action handlers. Individual character plugins can override these.
 * (c) Simon Logan
 */


// TODO: these functions are declared in more than one file. Find a way
// to share them.

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
    static findLocationItemByType(location, itemType) {
        if (location.items === undefined) {
            return null;
        }

        for (var i = 0; i < location.items.length; i++) {
            // TODO: handle ambiguous object descriptions (e.g. "take sword" when there are two swords).
            if (location.items[i].type === itemType) {
                return new itemInfo(location.items[i], i);
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

// END TODO


module.exports = {

    // No attributes provided by this module.

    handlers: {
        "fight": function(character, player, callback) {
            /*
             * The handler doesn't need to update the game. It just needs to
             * return description and data to indicate the result of the fight:
  
                     description: {
                         action: "fight",
                         success: true,       // was the fight successful?
                         message: message,    // description of the result, e.g. "you triumphed".
  
                     },
                     data: {
                         playerHealth: 10,    // The player's health after the fight
                         characterHealth: 5   // The character's health after the fight
                     }
             */

            console.log("Default fight handler");

            var playerHealth = player.health;
            var characterHealth = character.health;

            // If the player is using an object that has higher damage than their bare hands then
            // use the object's damage value.
            var playerDamage = player.damage;
            if (player.using.length > 0 &&
                player.using[0].hasOwnProperty('damage')) {
                playerDamage = Math.max(parseInt(
                    player.using[0].damage),
                    player.damage);
            }

            // Deal the damage
            playerHealth = Math.max(playerHealth - character.damage, 0);
            characterHealth = Math.max(characterHealth - playerDamage, 0);

            var resp = {
                playerName: player.name,  // Looks undefined - investigate.
                description: {
                    action: "fight",
                    success: true
                },
                data: {
                    playerHealth: playerHealth,
                    characterHealth: characterHealth
                }
            };

            callback(resp);
        },
        "fight for": function(character, object, player, callback) {
            // By default "fight for" behaves just like fight, except the game
            // will take the object from the character if you win.

            console.log("Default fight for handler");

            var playerHealth = player.health;
            var characterHealth = character.health;

            var playerDamage = player.damage;
            if (player.using.length > 0 &&
                player.using[0].hasOwnProperty('damage')) {
                playerDamage = Math.max(parseInt(
                    player.using[0].damage),
                    player.damage);
            }

            // Deal the damage
            playerHealth = Math.max(playerHealth - character.damage, 0);
            characterHealth = Math.max(characterHealth - playerDamage, 0);

            var resp = {
                playerName: player.name,
                description: {
                    action: "fight",
                    success: true
                },
                data: {
                    playerHealth: playerHealth,
                    characterHealth: characterHealth
                }
            };

            callback(resp);
        }
    }
};

