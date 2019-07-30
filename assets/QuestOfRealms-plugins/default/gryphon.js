/**
 * Created by Simon on 16/04/2017.
 * (c) Simon Logan
 */

module.exports = {

    category: "character",
    attributes: {
        "Gryphon": {
            image: "Gryphon.png",
            description: "Graceful, mountable predators.",
            additional_info: "Can be mounted if you bring them a young Iron Boar. Kill Giants - their natural enemies. Can be found in the Globed Forest.",
            health: 50,
            damage: 15,
            drops: ["feathers"]
        }
    },
    handlers: {
        "take from": function (gryphon, object, game, player, callback) {
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
