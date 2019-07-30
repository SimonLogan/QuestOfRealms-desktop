/**
 * Created by Simon on 08/06/2019.
 * (c) Simon Logan
 */

module.exports = {

    category: "item",
    attributes: {
        "food": {
            use: "food",
            image: "apple.png",
            description: "food.",
            consumable: true
        }
    },
    handlers: {
        "use": function (item, player, callback) {
            /*
             * The handler doesn't need to update the game. It just needs to
             * return description and data to indicate the result of using the item:
                    description: {
                         action: "use",
                         success: true,       // was it possible to use the object?
                         message: message,    // description of the result (if suitable),
                                              // e.g. "you now have the power of 10 men".
                     },
                     data: {
                         player: player     // Optional - updated player. For example,
                                            // using food increases the player's health.
                                            // The game is trusting your handler not to
                                            // mess up the player.
                     }
            */

            console.log("Default use handler");
            player.health += 5;

            var resp = {
                description: {
                    action: "use",
                    success: true,
                    message: "You feel better now."
                },
                data: {
                    player: player
                }
            };

            callback(resp);
        }
    }
};
