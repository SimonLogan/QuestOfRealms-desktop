/**
 * Created by Simon on 16/04/2017.
 * (c) Simon Logan
 */

module.exports = {

    category: "character",
    attributes: {
        "Gryphon": {
            image: "Gryphon2.png",
            description: "Graceful, mountable predators.",
            additional_info: "Can be mounted if you bring them a young Iron Boar. Kill Giants - their natural enemies. Can be found in the Globed Forest.",
            health: 50,
            damage: 15,
            drops: ["feathers"]
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
            console.log("*** in gryphon.give() " + JSON.stringify(object));
            console.log("*** ");

            var resp = {
                playerName: player.name,
                description: {
                    action: "give",
                    success: true,
                    message: "The Gryphon took the " + object.type
                }
            };

            console.log("in give() callback value");
            callback(resp);
        },
        "take from": function (character, object, player, callback) {
            /*
             * The handler doesn't need to update the game. It just needs to
             * return description.success=true/false to indicate whether you
             * can take the object from the Gryphon.
             */

            console.log("*** ");
            console.log("*** in gryphon.take from() " + JSON.stringify(object));
            console.log("*** ");

            resp = {
                playerName: player.name,
                description: {
                    action: "take from",
                    success: false,
                    message: "The Gryphon will not give you the " + object.type
                }
            };

            console.log("in take from() callback value");
            callback(resp);
        }
    }
};
