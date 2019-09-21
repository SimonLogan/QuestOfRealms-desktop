# Backlog

## Game editor

### Outstanding features:
- Feature 1: Code tidyup.
- Feature 2: Add the goal type "acquire object by name". Currently you can only acquire objects by type
             e.g. "sword", but you should be able to require "The sword of destiny".
- Feature 3: Add the goal type "give object by name" - as for "acquire by name".
- Feature 4: Add the goal type "give (named) object to named character". e.g.
             "give sword to Jim the Giant", "give sword to Jim the Giant", "give The Sword of Destiny to Jim the Giant"
- Feature 5: "Automatically draw the whole map" shows the contents of all locations.
             This makes the game too easy. It should only show contents of visited locations.
  * Rename the current "Automatically draw the whole map" option to "Automatically draw all map locations and contents".  
  * Add a new option "Automatically all map locations" to implement the new behaviour described above.  
  * Rename "Automatically draw visited map locations" to "Automatically draw visited map locations and contents".   
  * Rename "Manually draw visited map locations - old school!" to "Draw your own map on paper - old school!".

- Feature 6: The ability to navigate to a named location.
- Feature 7: Implement health cost to travelling through different types of terrain.
- Feature 8: Require a boat to be able to travel on water.
- Feature 9: Allow items to be crafted from other items.
- Feature 10: Add the goal type "kill \<character type\>"
- Feature 11: Magic - loads of scope here:
  * Feature 11.1: Magic allows you to see further on the map, maybe depending on magic ability.
  * Feature 11.2: Add things that enhance your magic powers - certain foods or finding certain books.
  * Feature 11.2: Certain tasks that can only be accomplished with magic.
  * Feature 11.2: Certain opponents that can only be fought with magic.
  ...
- Feature 12: Group locations into named regions.
- Feature 13: Support subrealms, for example the inside of a building.

### Completed features:


### Outstanding bugs:
- Bug 1: If you drop an item in the start location the player icon disappears.
- Bug 2: If You have clicked on a location character in the "Edit Location Properties / Characters" tab, and you click on a different location,
         the character details are not cleared from the properties window.
- Bug 4: You can export a game with no realms.
- Bug 5: In the game editor, pressing "Add new realm" doesn't put the focus on the "Name" field.

### Fixed bugs:
- Bug 3: If you Edit a character name in the "Edit Location Properties / Characters" tab, the health and damage values disappear.

## Player
