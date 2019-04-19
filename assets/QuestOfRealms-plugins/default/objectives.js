/**
 * Created by Simon on 17/04/2017.
 * (c) Simon Logan
 */

module.exports = {

   category: "objective",
   attributes: {
      "Start at": {
         description: "Where you start the game.",
         mandatory: true,
         parameters: [
            { name: "x", type: "int" },
            { name: "y", type: "int" }
         ]
      },
      "Navigate to": {
         description: "Navigate to a specified map location.",
         parameters: [
            { name: "x", type: "int" },
            { name: "y", type: "int" }
         ]
      },
      "Acquire item": {
         description: "Acquire a particular item.",
         parameters: [
            { name: "item name", type: "string" },
            { name: "number", type: "int" }
         ]
      },
      "Give item": {
         description: "Give an item away.",
         parameters: [
            { name: "item name", type: "string" },
            { name: "recipient", type: "string" }
         ]
      }
   },
   handlers: {
      "Navigate to": function (objective, game, realm, playerName, playerLocation, callback) {
         console.log("in Navigate to()");

         if (game.player.name !== playerName) {
            var errMsg = "Invalid player";
            console.log(errMsg);
            callback(errMsg);
            return;
         }

         var location = objective.params[0].value + "_" +
            objective.params[1].value;
         console.log("Looking for realmId: " + realm._id + ", location: " + location);
         var visited = false;
         if (game.player.visited.hasOwnProperty(realm._id)) {
            visited = game.player.visited[realm._id].hasOwnProperty(location);
         }

         console.log("visited: " + visited);
         if (!visited) {
            console.log("in Navigate to() callback null");
            callback(null);
            return;
         }

         // Mark the objective complete.
         // TODO: return the details of the updated objective. Don't update the param directly.
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
      },
      "Acquire item": function (objective, game, realm, playerName, playerLocation, callback) {
         console.log("in Acquire item()");

         if (game.player.name !== playerName) {
            var errMsg = "Invalid player";
            console.log(errMsg);
            callback(errMsg);
            return;
         }

         var object = objective.params[0].value;
         var numRequired = objective.params[1].value;

         console.log("Looking for object: " + object +
            ", numRequired: " + numRequired);

         if (game.player.inventory === undefined) {
            callback(null);
            return;
         }

         var found = 0;
         for (j = 0; j < game.player.inventory.length; j++) {
            var entry = game.player.inventory[j];
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
         // TODO: return the details of the updated objective. Don't update the param directly.
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
      },
      "Give item": function (objective, game, realm, playerName, playerLocation, callback) {
         console.log("in Give item()");

         if (game.player.name !== playerName) {
            var errMsg = "Invalid player";
            console.log(errMsg);
            callback(errMsg);
            return;
         }

         if (game.player === undefined) {
            console.log("in Give item(): player not found.");
            callback(null);
            return;
         }

         // If a "give to" operation has just been performed, it took place
         // in the current location.
         if (!playerLocation) {
            var errMsg = "Invalid location";
            console.log(errMsg);
            callback(errMsg);
            return;
         }

         // Find all the characters in the current location, and see if one
         // has the item in question, with a possession reason of "given by"
         // the current player.
         var notifyData = {};
         console.log("in Give item() callback " + JSON.stringify(playerLocation));
         var object = objective.params[0].value;
         var recipient = objective.params[1].value;
         var character;
         for (var i = 0; i < playerLocation.characters.length; i++) {
            // We're not currently checking character name, so check all
            // the characters of that type.
            console.log("in Give item() recipient " + JSON.stringify(recipient));
            if (playerLocation.characters[i].type === recipient) {
               character = playerLocation.characters[i];
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
                        // TODO: return the details of the updated objective. Don't update the param directly.
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
                        console.log("in Give item(): item does not match objective.");
                     }
                  }
               }
            }
         }
      }
   }
};
