/**
 * Created by Simon on 17/04/2017.
 * (c) Simon Logan
 */

module.exports = {

   category: "objective",
   attributes: [
      {
         name: "Start at",
         description: "Where you start the game.",
         mandatory: true,
         parameters: [
            { name: "x", type: "int" },
            { name: "y", type: "int" }
         ]
      },
      {
         name: "Navigate to",
         description: "Navigate to a specified map location.",
         parameters: [
            { name: "x", type: "int" },
            { name: "y", type: "int" }
         ]
      },
      {
         name: "Acquire item",
         description: "Acquire a particular item.",
         parameters: [
            { name: "item name", type: "string" },
            { name: "number", type: "int" }
         ]
      },
      {
         name: "Give item",
         description: "Give an item away.",
         parameters: [
            { name: "item name", type: "string" },
            { name: "recipient", type: "string" }
         ]
      }
   ],
   handlers: {
      "Navigate to": function (objective, game, realm, playerName, callback) {
         console.log("in Navigate to()");

         console.log("game.players:" + JSON.stringify(game.players));
         for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].name !== playerName)
               continue;

            var location = objective.params[0].value + "_" +
               objective.params[1].value;
            console.log("Looking for realmId: " + realm.id + ", location: " + location);
            var visited = false;
            if (game.players[i].visited.hasOwnProperty(realm.id)) {
               visited = game.players[i].visited[realm.id].hasOwnProperty(location);
            }

            console.log("visited: " + visited);
            if (!visited) {
               console.log("in Navigate to() callback null");
               callback(null);
               return;
            }

            // Mark the objective complete.
            objective.completed = "true";
            resp = {
               player: playerName,
               description: {
                  action: "objective completed"
               },
               data: {
                  objective: objective
               }
            };

            console.log("in Navigate to() callback value");
            callback(resp);
         }
      },
      "Acquire item": function (objective, game, realm, playerName, callback) {
         console.log("in Acquire item()");

         console.log("game.players:" + JSON.stringify(game.players));
         for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].name !== playerName)
               continue;

            var object = objective.params[0].value;
            var numRequired = objective.params[1].value;

            console.log("Looking for object: " + object +
               ", numRequired: " + numRequired);

            if (game.players[i].inventory === undefined) {
               callback(null);
               return;
            }

            var found = 0;
            for (j = 0; j < game.players[i].inventory.length; j++) {
               var entry = game.players[i].inventory[j];
               if (entry.type === object)
                  found++;

               if (found === numRequired)
                  break;
            }

            if (found < numRequired) {
               callback(null);
               return;
            }

            // Mark the objective complete.
            objective.completed = "true";
            resp = {
               player: playerName,
               description: {
                  action: "objective completed"
               },
               data: {
                  objective: objective
               }
            };

            console.log("in Acquire item() callback value");
            callback(resp);
         }
      },
      "Give item": function (objective, game, realm, playerName, callback) {
         console.log("in Give item()");

         console.log("game.players:" + JSON.stringify(game.players));

         // Get current location. If a "give to" operation has just been
         // performed, it took place in the current location.
         var player;
         for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].name === playerName) {
               player = game.players[i];
               break;
            }
         }

         if (player === undefined) {
            console.log("in Give item(): player not found.");
            callback(null);
            return;
         }

         // Find all the characters in the current location, and see if one
         // has the item in question, with a possession reason of "given by"
         // the current player.
         MapLocation.findOne({
            'realmId': realm.id,
            'x': player.location.x,
            'y': player.location.y.toString()
         }).exec(function (err, location) {
            var notifyData = {};

            console.log("in Give item().find() callback");
            if (err) {
               console.log("Give item() db err:" + err);
               callback(null);
               return;
            } else {
               console.log("in Give item() callback, no error.");
               if (location) {
                  console.log("in Give item() callback " + JSON.stringify(location));
                  var object = objective.params[0].value;
                  var recipient = objective.params[1].value;

                  var character;
                  for (var i = 0; i < location.characters.length; i++) {
                     // We're not currently checking character name, so check all
                     // the characters of that type.
                     console.log("in Give item() recipient " + JSON.stringify(recipient));
                     if (location.characters[i].type === recipient) {
                        character = location.characters[i];
                        console.log("in Give item() found character " + JSON.stringify(character));
                        if (character.inventory !== undefined) {
                           for (var j = 0; j < character.inventory.length; j++) {

                              var item = character.inventory[j];
                              console.log("in Give item() character inventory item: " + JSON.stringify(item));
                              if (item.type === object &&
                                 item.source !== undefined &&
                                 item.source.reason !== undefined &&
                                 item.source.reason === "give" &&
                                 item.source.from !== undefined &&
                                 item.source.from === playerName) {
                                 console.log("in Give item(): character given object from player");

                                 // Mark the objective complete.
                                 objective.completed = "true";
                                 resp = {
                                    player: playerName,
                                    description: {
                                       action: "objective completed"
                                    },
                                    data: {
                                       objective: objective
                                    }
                                 };

                                 console.log("in Give item() callback value");
                                 callback(resp);
                                 return;
                              } else {
                                 console.log("in Give item(): item has no source.");
                              }
                           }
                        }
                     }
                  }
               }
               else {
                  console.log("Current location not found");
                  callback(null);
                  return;
               }
            }
         });
      }
   }

};

