/**
 * Created by Simon on 16/04/2017.
 */

module.exports = {

  category: "character",
  attributes: {
    type: "Gryphon",
    image: "images/Gryphon.png",
    description: "Graceful, mountable predators.",
    additional_info: "Can be mounted if you bring them a young Iron Boar. Kill Giants - their natural enemies. Can be found in the Globed Forest.",
    health: 50,
    damage: 15,
    drops: ["feathers"]
  },
  handlers: {
       "take from": function(gryphon, object, game, playerName, callback) {
          /*
           * The handler doesn't need to update the game. It just needs to
           * return description.success=true/false to indicate whether you
           * can take the object from the Gryphon.
           */

          sails.log.info("*** ");
          sails.log.info("*** in gryphon.take from() " + JSON.stringify(object));
          sails.log.info("*** ");

          resp = {
             player: playerName,
             description: {
                action: "take from",
                success: false,
                message: "The Gryphon will not give you the " + object.type
             }
          };

          sails.log.info("in take from() callback value");
          callback(resp);
       }
  }

};

