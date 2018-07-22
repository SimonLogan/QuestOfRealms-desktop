/**
 * Created by Simon on 16/04/2017.
 * Implement default action handlers. Individual character plugins can override these.
 *
 */


// TODO: these functions are declared in more than one file. Find a way
// to share them.

class playerInfo {
    constructor(player, playerIndex) {
        this.player = player;
        this.playerIndex = playerIndex;
   }
}

class findPlayer {
    static findPlayerByName(game, playerName) {
        for (var i = 0; i < game.players.length; i++) {
            if (game.players[i].name === playerName) {
                return new playerInfo(game.players[i], i);
            }
        }

		return null;
    }
}

// Find an item
class itemInfo {
    constructor(item, itemIndex) {
        this.item = item;
        this.itemIndex = itemIndex;
   }
}

class findItem {
    static findLocationItemByType(location, itemType) {
        if (location.items === undefined) {
		        return null;
        }

        for (var i = 0; i < location.items.length; i++) {
            // TODO: handle ambiguous object descriptions (e.g. "take sword" when there are two swords).
            if (location.items[i].type === itemType) {
    		         return new itemInfo(location.items[i], i);
   	        }
        }

		    return null;
    }
}

// Find a character
class characterInfo {
    constructor(character, characterIndex) {
        this.character = character;
        this.characterIndex = characterIndex;
   }
}

class findCharacter {
    static findLocationCharacterByType(location, characterType) {
        if (location.characters === undefined) {
		        return null;
        }

        for (var i = 0; i < location.characters.length; i++) {
            if (location.characters[i].type === characterType) {
    		         return new characterInfo(location.characters[i], i);
   	        }
        }

		    return null;
    }
}

// For string template substitution.
var template = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v]);

// END TODO


module.exports = {

  // No attributes provided by this module.

  handlers: {
       "fight": function(character, game, playerName, callback) {
          /*
           * The handler doesn't need to update the game. It just needs to
           * return description and data to indicate the result of the fight:

                   description: {
                       action: "fight",
                       success: true,       // was the fight successful?
                       message: message,    // description of the result, e.g. "you triumphed".

                   },
                   data: {
                       playerHealth: 10,              // The player's health after the fight
                       characterHealth: 5,            // The character's health after the fight
                       playerWon: playerWon           // true if the player won.
                       playerDied: playerDied,        // true if the player died.
                       characterDied: characterDied   // true if the character died.
                   }

           */

           sails.log.info("Default fight handler");

           var playerInfo = findPlayer.findPlayerByName(game, playerName);
           var playerOrigHealth = playerInfo.player.health;
           var characterOrigHealth = character.health;
           var playerHealth = playerOrigHealth;
           var characterHealth = characterOrigHealth;

           // Deal the damage
           sails.log.info("Before fight. player.health: " + playerInfo.player.health +
                          ", player.damage: " + playerInfo.player.damage +
                          ", character.health: " + character.health +
                          ", character damage: " + character.damage);

           // The player can't fight if health is 0.
           // Note on the format/message split below. If we ever wish to localise the strings,
           // "You are too weak to fight. The ${character_type} was victorious." is much better
           // for translators as there is a full sentence to work with, and the embedded named
           // token gives info about what data it contains. Compare this to the much worse
           // translate("You are too weak to fight. The ") + character.type + translate(" was victorious.");
           var format = "You are too weak to fight. The ${character_type} was victorious.";
           var message = template(format, {character_type: character.type});
           var playerWon = false;
           if (playerHealth > 0) {
               playerHealth = Math.max(playerHealth - character.damage, 0);
               characterHealth = Math.max(characterHealth - playerInfo.player.damage, 0);

               // The victor is the combatant that does the biggest %age damage to the opponent.
               var playerDamageDealt = Math.round((playerInfo.player.damage / characterOrigHealth) * 100);
               var characterDamageDealt = Math.round((character.damage / playerOrigHealth) * 100);

               sails.log.info("After fight. player.health: " + playerHealth +
                              ", character.health: " + characterHealth +
                              ", player dealt damage: " + playerDamageDealt + "% " +
                              ", character dealt damage: " + characterDamageDealt + "%");

               var characterDied = false;
               var playerDied = false;
               message = "You fought valiantly.";
               if (characterHealth === 0 && playerHealth > 0) {
                   format = "You fought valiantly. The ${character_type} died.";
                   characterDied = true;
                   message = template(format, {character_type: character.type});
                   playerWon = true;
               } else if (characterHealth > 0 && playerHealth === 0) {
                   message = "You fought valiantly, but you died.";
                   playerDied = true;
               } else if (characterHealth === 0 && playerHealth === 0) {
                   message = "You fought valiantly, but you both died.";
               } else {
                   // Neither died. Judge the victor on who dealt the highest %age damage, or if damage
                   // was equal, judge based on remaining strength.
                   if ((playerDamageDealt > characterDamageDealt) ||
                       ((playerDamageDealt === characterDamageDealt) &&
                        (playerHealth > characterHealth))) {
                       message = "You fought valiantly and were victorious.";
                       playerWon = true;
                   } else if ((characterDamageDealt > playerDamageDealt) ||
                              ((playerDamageDealt === characterDamageDealt) &&
                               (characterHealth > playerHealth))) {
                       format = "You fought valiantly but unfortunately the ${character_type} was victorious.";
                       message = template(format, {character_type: character.type});
                   } else {
                       // Evenly matched so far, declare a draw.
                       message = "You both fought valiantly, but are evently matched.";
                   }
               }
           }

           var resp = {
               player: playerName,
                   description: {
                       action: "fight",
                       success: true,
                       message: message
                   },
                   data: {
                       playerHealth: playerHealth,
                       characterHealth: characterHealth,
                       playerWon: playerWon,
                       playerDied: playerDied,
                       characterDied: characterDied
                   }
           };

           sails.log.info("in fight() callback value");
           callback(resp);
       },
       "fight for": function(character, object, game, playerName, callback) {
           // By default "fight for" behaves just like fight, except the game
           // will take the object from the character if you win.

           sails.log.info("Default fight for handler");

           var playerInfo = findPlayer.findPlayerByName(game, playerName);
           var playerOrigHealth = playerInfo.player.health;
           var characterOrigHealth = character.health;
           var playerHealth = playerOrigHealth;
           var characterHealth = characterOrigHealth;

           // Deal the damage
           sails.log.info("Before fight for. player.health: " + playerInfo.player.health +
                          ", player.damage: " + playerInfo.player.damage +
                          ", character.health: " + character.health +
                          ", character damage: " + character.damage);

           // The player can't fight if health is 0.
           // Note on the format/message split below. If we ever wish to localise the strings,
           // "You are too weak to fight. The ${character_type} was victorious." is much better
           // for translators as there is a full sentence to work with, and the embedded named
           // token gives info about what data it contains. Compare this to the much worse
           // translate("You are too weak to fight. The ") + character.type + translate(" was victorious.");
           var format = "You are too weak to fight. The ${character_type} was victorious.";
           var message = template(format, {character_type: character.type});
           var playerWon = false;
           if (playerHealth > 0) {
               playerHealth = Math.max(playerHealth - character.damage, 0);
               characterHealth = Math.max(characterHealth - playerInfo.player.damage, 0);

               // The victor is the combatant that does the biggest %age damage to the opponent.
               var playerDamageDealt = Math.round((playerInfo.player.damage / characterOrigHealth) * 100);
               var characterDamageDealt = Math.round((character.damage / playerOrigHealth) * 100);

               sails.log.info("After fight for. player.health: " + playerHealth +
                              ", character.health: " + character.health +
                              ", player dealt damage: " + playerDamageDealt + "% " +
                              ", character dealt damage: " + characterDamageDealt + "%");

               var characterDied = false;
               var playerDied = false;
               message = "You fought valiantly.";
               if (characterHealth === 0 && playerHealth > 0) {
                   format = "You fought valiantly. The ${character_type} died.";
                   characterDied = true;
                   message = template(format, {character_type: character.type});
                   playerWon = true;
               } else if (characterHealth > 0 && playerHealth === 0) {
                   message = "You fought valiantly, but you died.";
                   playerDied = true;
               } else if (characterHealth === 0 && playerHealth === 0) {
                   message = "You fought valiantly, but you both died.";
               } else {
                   // Neither died. Judge the victor on who dealt the most %age damage, or if damage
                   // was equal, judge based on remaining strength.
                   if ((playerDamageDealt > characterDamageDealt) ||
                       ((playerDamageDealt === characterDamageDealt) &&
                        (playerHealth > characterHealth))) {
                       message = "You fought valiantly and were victorious.";
                       playerWon = true;
                   } else if ((characterDamageDealt > playerDamageDealt) ||
                              ((playerDamageDealt === characterDamageDealt) &&
                               (characterHealth > playerHealth))) {
                       format = "You fought valiantly but unfortunately the ${character_type} was victorious.";
                       message = template(format, {character_type: character.type});
                   } else {
                       // Evenly matched so far, declare a draw.
                       message = "You both fought valiantly, but are evently matched.";
                   }
               }
           }

           var resp = {
               player: playerName,
                  description: {
                      action: "fight",
                      success: true,
                      message: message
                  },
                  data: {
                      playerHealth: playerHealth,
                      characterHealth: characterHealth,
                      playerWon: playerWon,
                      playerDied: playerDied,
                      characterDied: characterDied
                  }
           };

           sails.log.info("in fight for() callback value");
           callback(resp);
       }
  }
};

