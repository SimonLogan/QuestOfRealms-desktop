/**
 * Created by Simon on 16/04/2017.
 * (c) Simon Logan
 */

module.exports = {

  category: "character",
  attributes: {
    type: "Giant",
    image: "Giant.png",
    description: "Lumbering, stupid humanoids.",
    additional_info: "Can be found herding Iron Boars. Easily killed by Gryphons. They love gold.",
    health: 15,
    damage: 5,
    drops: ["leather"]
  },
  handlers: {
       "give": function(giant, object, game, playerName, callback) {
          /*
           * The handler doesn't need to update the game. It just needs to
           * return description.success=true/false to indicate whether the
           * Giant took the object.
           */

          console.log("*** ");
          console.log("*** in giant.give() " + JSON.stringify(object));
          console.log("*** ");

          var resp = {
             player: playerName,
             description: {
                action: "give",
                success: true,
                message: "The giant took the " + object.type
             }
          };

          console.log("in give() callback value");
          callback(resp);
       },
       "take from": function(giant, object, game, playerName, callback) {
          /*
           * The handler doesn't need to update the game. It just needs to
           * return description.success=true/false to indicate whether you
           * can take the object from the Giant.
           */

          console.log("*** ");
          console.log("*** in giant.take from() " + JSON.stringify(object));
          console.log("*** ");

          var resp = {
             player: playerName,
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
       "buy from": function(giant, object, game, playerName, callback) {
          /*
           * The handler doesn't need to update the game. It just needs to
           * return description.success=true/false to indicate whether you
           * were able to buy the object from the Giant.
           */

          console.log("*** ");
          console.log("*** in giant.buy from() " + JSON.stringify(object));
          console.log("*** ");

          // Check whether the player can pay.
          var player = null;
          for (var i=0; i<game.players.length; i++) {
             if (game.players[i].name === playerName) {
                player = game.players[i];
                break;
             }
          }

          // Giants sell all items for 1 coin.
          var payment = null;
          if (player.inventory !== undefined) {
              for (var i=0; i<player.inventory.length; i++) {
                 if (player.inventory[i].type === "coin") {
                    payment = player.inventory[i];
                    break;
                 }
              }
          }

          var resp = null;
          if (payment) {
             resp = {
                 player: playerName,
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
                 player: playerName,
                 description: {
                    action: "buy from",
                    success: false,
                    message: "You do not have a coin to pay for the " + object.type + "."
                 }
              };
          }

          console.log("in take from() callback value");
          callback(resp);
       }
  }

};

