/**
 * Created by Simon on 16/04/2017.
 */

module.exports = {

  category: "character",
  attributes: {
    type: "night spider",
    image: "images/NightSpider.png",
    description: "Sinister, silent killers.",
    additional_info: "Webs can be made into bow strings. can appear in any realm. can give you sleeping sickness (-1 health per minute when you have it). juveniles can be domesticated to replenish bow strings.",
    health: 3,
    damage: 10,
    drops: ["string", "spider fangs"]
  },
  handlers: {
       "give": function(nightSpider, object, game, playerName, callback) {
          /*
           * The handler doesn't need to update the game. It just needs to
           * return description.success=true/false to indicate whether the
           * Night spider took the object.
           */

          sails.log.info("*** ");
          sails.log.info("*** in nightSpider.give() " + JSON.stringify(object));
          sails.log.info("*** ");

          // The night spider only wants food.
          if (object.type !== "food") {
             resp = {
                player: playerName,
                description: {
                   action: "give",
                   success: false,
                   message: "The night spider doesn't want the " + object.type
                },
                data: {}
             };

             sails.log.info("in give() callback value");
             callback(resp);
             return;
          }

          resp = {
             player: playerName,
             description: {
                action: "give",
                success: true,
                message: "The night spider took the " + object.type
             },
             data: {}
          };

          sails.log.info("in give() callback value");
          callback(resp);
       }
  }

};

