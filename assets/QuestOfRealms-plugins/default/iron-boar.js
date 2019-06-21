/**
 * Created by Simon on 16/04/2017.
 * (c) Simon Logan
 */

module.exports = {

  category: "character",
  attributes: {
    "Iron boar": {
      image: "IronBoar.png",
      description: "Tough, easily tamed animals.",
      additional_info: "Medium armour. Can be domesticated. Found on Endless plains, and in Utropica. Loves to eat Forge Weed.",
      health: 20,
      damage: 5,
      drops: ["iron", "gold"]
    }
  },
  handlers: {
    "take from": function (ironboar, object, game, player, callback) {
      /*
       * The handler doesn't need to update the game. It just needs to
       * return description.success=true/false to indicate whether you
       * can take the object from the Iron boar.
       */

      console.log("*** ");
      console.log("*** in iron-boar.take from() " + JSON.stringify(object));
      console.log("*** ");

      var resp = {
        playerName: player.name,
        description: {
          action: "take from",
        }
      };

      if (object.type === "food") {
        resp.description.success = false;
        resp.description.message = "The Iron boar will not give you the " + object.type;
      } else {
        resp.description.success = true;
        resp.description.message = "You have taken the " + object.type;
      }

      console.log("in take from() callback value");
      callback(resp);
    },
  }
};
