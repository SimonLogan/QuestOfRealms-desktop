/**
 * Created by Simon on 16/04/2017.
 * (c) Simon Logan
 */

module.exports = {

    category: "character",
    attributes: {
        "Giant": {
            image: "Giant2.png",
            description: "Lumbering, stupid humanoids.",
            additional_info: "Can be found herding Iron Boars. Easily killed by Gryphons. They love gold.",
            health: 15,
            damage: 5,
            drops: ["leather"]
        }
    },
    handlers: {
        "give": function (character, object, player, callback) {
            /*
             * The handler doesn't need to update the game. It just needs to
             * return description.success=true/false to indicate whether the
             * Giant took the object.
             */

            console.log("*** ");
            console.log("*** in giant.give() " + JSON.stringify(object));
            console.log("*** ");

            var resp = {
                playerName: player.name,
                description: {
                    action: "give",
                    success: true,
                    message: "The giant took the " + object.type
                }
            };

            console.log("in give() callback value");
            callback(resp);
        },
        "take from": function (character, object, player, callback) {
            /*
             * The handler doesn't need to update the game. It just needs to
             * return description.success=true/false to indicate whether you
             * can take the object from the Giant.
             */

            console.log("*** ");
            console.log("*** in giant.take from() " + JSON.stringify(object));
            console.log("*** ");

            var resp = {
                playerName: player.name,
                description: {
                    action: "take from",
                    success: false,
                    message: "The giant will not give you the " + object.type +
                        " but will sell it to you for one coin."
                }
            };

            console.log("in take from() callback value");
            callback(resp);
        },
        "buy from": function (character, object, player, callback) {
            /*
             * The handler doesn't need to update the game. It just needs to
             * return description.success=true/false to indicate whether you
             * were able to buy the object from the Giant.
             */

            console.log("*** ");
            console.log("*** in giant.buy from() " + JSON.stringify(object));
            console.log("*** ");

            // Check whether the player can pay.
            // Giants sell all items for 1 coin.
            var payment = null;
            if (player.inventory !== undefined) {
                for (var i = 0; i < player.inventory.length; i++) {
                    if (player.inventory[i].type === "coin") {
                        payment = player.inventory[i];
                        break;
                    }
                }
            }

            var resp = null;
            if (payment) {
                resp = {
                    playerName: player.name,
                    description: {
                        action: "buy from",
                        success: true,
                        message: "The Giant sold you the " + object.type + "."
                    },
                    data: {
                        payment: payment
                    }
                };
            } else {
                resp = {
                    playerName: player.name,
                    description: {
                        action: "buy from",
                        success: false,
                        message: "You do not have a coin to pay for the " + object.type + "."
                    }
                };
            }

            console.log("in take from() callback value");
            callback(resp);
        },
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

            console.log("Giant fight handler");

            var playerHealth = player.health;
            var characterHealth = character.health;

            // If the player is using an object that has higher damage than their bare hands then
            // use the object's damage value. This is the same logic used in the default fight handler
            // in default-handlers.js.
            var playerDamage = player.damage;
            if (player.using.length > 0 &&
                player.using[0].hasOwnProperty('damage')) {
                playerDamage = Math.max(parseInt(
                    player.using[0].damage),
                    player.damage);
            }

            // Deal the damage
            // Special case for any Giant called "GiantMcGiantface"
            var giantDamage = character.damage;
            var message = "";
            if (character.name === "GiantMcGiantface") {
                giantDamage = character.damage * 2;
                message = "Alas, you have picked a fight with GiantMcGiantface, " +
                          "who is as mighty as two regular giants.";
            }
            playerHealth = Math.max(playerHealth - giantDamage, 0);
            characterHealth = Math.max(characterHealth - playerDamage, 0);

            var resp = {
                playerName: player.name,  // Looks undefined - investigate.
                description: {
                    action: "fight",
                    success: true,
                    message: message
                },
                data: {
                    playerHealth: playerHealth,
                    characterHealth: characterHealth
                }
            };

            callback(resp);
        },
        "fight for": function(character, object, player, callback) {
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

            // By default "fight for" behaves just like fight, except the game
            // will take the object from the character if you win.

            console.log("Default fight for handler");

            var playerHealth = player.health;
            var characterHealth = character.health;

            // If the player is using an object that has higher damage than their bare hands then
            // use the object's damage value. This is the same logic used in the default fight handler
            // in default-handlers.js.
            var playerDamage = player.damage;
            if (player.using.length > 0 &&
                player.using[0].hasOwnProperty('damage')) {
                playerDamage = Math.max(parseInt(
                    player.using[0].damage),
                    player.damage);
            }

            // Deal the damage
            // Special case for any Giant called "GiantMcGiantface"
            var giantDamage = character.damage;
            var message = "";
            if (character.name === "GiantMcGiantface") {
                giantDamage = character.damage * 2;
                message = "Alas, you have picked a fight with GiantMcGiantface, " +
                          "who is as mighty as two regular giants.";
            }
            playerHealth = Math.max(playerHealth - giantDamage, 0);
            characterHealth = Math.max(characterHealth - playerDamage, 0);

            var resp = {
                playerName: player.name,
                description: {
                    action: "fight",
                    success: true,
                    message: message
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
