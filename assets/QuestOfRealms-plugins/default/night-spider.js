/**
 * Created by Simon on 16/04/2017.
 * (c) Simon Logan
 */

module.exports = {

    category: "character",
    attributes: {
        "night spider": {
            image: "NightSpider.png",
            description: "Sinister, silent killers.",
            additional_info: "Webs can be made into bow strings. can appear in any realm. can give you sleeping sickness (-1 health per minute when you have it). juveniles can be domesticated to replenish bow strings.",
            health: 3,
            damage: 10,
            drops: ["string", "spider fangs"]
        }
    },
    handlers: {
        "give": function (nightSpider, object, game, player, callback) {
            /*
             * The handler doesn't need to update the game. It just needs to
             * return description.success=true/false to indicate whether the
             * Night spider took the object.
             */

            console.log("*** ");
            console.log("*** in nightSpider.give() " + JSON.stringify(object));
            console.log("*** ");

            // The night spider only wants food.
            if (object.type !== "food") {
                resp = {
                    playerName: player.name,
                    description: {
                        action: "give",
                        success: false,
                        message: "The night spider doesn't want the " + object.type
                    },
                    data: {}
                };

                console.log("in give() callback value");
                callback(resp);
                return;
            }

            resp = {
                playerName: player.name,
                description: {
                    action: "give",
                    success: true,
                    message: "The night spider took the " + object.type
                },
                data: {}
            };

            console.log("in give() callback value");
            callback(resp);
        }
    }
};
