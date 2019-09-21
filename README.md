# QuestOfRealms
A new take on an old-school text-based adventure.

QuestOfRealms was intended as a "just good enough" implementation to allow students to
improve their programming skills by enhancing the game. It includes technologies that
are likely to be encountered in modern software development:
- Electron node.js-based desktop app
- web application frameworks (backbone)
- document database (nedb)
- client-side javascript libraries (jQuery)

The game includes a game editor and the ability to play games.
The framework is designed for modding, and you can add your own characters and
specify their attributes and behaviours - create subdirectories in QuestOfRealms/assets/QuestOfRealms-plugins/
in the game editor. When exporting a game, all module dependencies will be exported.
Some examples are provided in QuestOfRealms-plugins/default

---
## Linux installation (OpenSuse)
Install nodejs
```
sudo zypper install nodejs
Check the installed version with
node -v
```
Install Electron forge
```
sudo npm install -g electron-forge
```

Install git
```
sudo zypper install git
```

Create a working directory
```
mkdir -p ~/workspace
cd ~/workspace/
```

Clone the questofrealms-desktop github repository (https://help.github.com/en/articles/cloning-a-repository)
```
git clone https://github.com/SimonLogan/QuestOfRealms-desktop.git
```

This will create ~/workspace/QuestOfRealms-desktop/ containing the source of the project.

Or pull in updates after initial download
```
git fetch origin
git merge origin/master
```

Change to the project directory and install the node packages required by the project.
These are specified in packages.json
```
cd QuestOfRealms-desktop
npm install
```

## App overview
---
### Run the app
```
npm start
```

The app launches and displays the main window, where you may choose game mode or design mode.

#### Game mode
Choosing game mode will display a list of available games, and their saves.
Any saved version can be played or deleted using the associated buttons.

![Game list](/Documentation/Player/gamelist.png)

New games can be imported using the "Import Game" button. You will need to supply a player name when importing a game. Importing a game imports the plugins needed to play that game.
You cannot import games with duplicate names. The name comes from the manifest data in the zipfile, and not the file name.
Imported games are saved in a suitably-named subdirectory of
%AppData%\Roaming\questofrealms-desktop\games on windows, and
~/.config/questofrealms-desktop/games on Linux.

Choosing a game to play launches the game play window.

![Game play screen](/Documentation/Player/playgame-screen.png)

#### Game mode > The map window
The map can be configured to automatically draw the entire map or to automatically draw only visited map locations, depending on how much you want to enjoy exploring the realm based on just the text descriptions.

The map cells indicate the contents of that location using the following icons.

![Player icon](/Documentation/Player/player-doc-icon.png) This icon indicates the current player location on the map. If the icon is lying on its side the player is dead.

![NPC icon](/Documentation/Player/NPC-doc-icon.png) This icon indicates the presence of non-player characters (NPCs) in a given map location. You may interact with NPCs in various ways.

![Object icon](/Documentation/Player/object-doc-icon.png) This icon indicates the presence of objects in a given map location. Objects may be taken, dropped, or used to interact with NPCs.

#### Game mode > The command window
The command window displays commands input by the player and the game's responses. The last item displayed in the command window will be temporarily highlighted in blue.

![Command highlight](/Documentation/Player/command-highlight-example.png)

The available commands are as follows. [] indicates optional parameters.

**help** Display the available commands. Certain commands have individual helptext, which will be indicated in the general helptext.

**look [direction]** describe the adjacent location in the specified direction, or the current location if no direction is specified.

**move direction** move in the specified direction, if possible.

**take item [from character]** take the named item. e.g. "take short sword" from the specified character, or from the current location if no character is specified.

**buy item from character** buy the named item from the specified character.
e.g. "buy short sword from Giant". If you try to take the item first, the character will name the price if it is willing to sell the item.

**drop item** drop the named item. e.g. "drop short sword".

**inventory** list the items in your inventory.

**describe (...)** describe character or item, Use "help describe" for more details.

**status** show health and game progress.

**save [name]** save the game, optionally giving this save a name.

**level up** move to the next realm, assuming you have completed all the current realm's objectives.

Commands are entered into the single-line field at the bottom of the command window.

![Command entry](/Documentation/Player/command-entry-example.png)

#### Game mode > Playing the game
A game is split across a number of levels, called realms. You complete a realm by completing all the objectives set for that realm. You can see the objective progress using the **status** command.

![Command status](/Documentation/Player/command-status-example.png)

This example tells us that this realm has a single objective - to acquire a single long sword.

You will be notified when you complete an objective:

![Objective completion](/Documentation/Player/objective-completion-example1.png)

You will be notified when you have completed all objectives:

![All objective completion](/Documentation/Player/objective-completion-example2.png)

If there is another realm, you will be asked if you want to start the new level. If you choose not to start the new level immediately, you do so later using the **level up** command.

### Design mode
Choosing design mode will display a list of available game designs.
Game designs can be edited, exported or deleted using the associated buttons.
![Game design list](/Documentation/Designer/game-design-list.png)

Exporting a game will display the "Export playable game" form, which will prompt you for a game name and optional description. The file will be exported to the chosen directory as a zipfile with the chosen name. This can then be imported in Game mode and played.

Creating a new game will prompt you for a game name and description and will take you to the edit game design screen, as will editing an existing game.

#### Design mode > Editing a game design
The edit game design screen will display the realms in the game, listed in play order. These can be re-ordered or removed using the associated buttons.
The screen will also display a list of available realms that can be added to the game design. Realms can be shared between game designs.
Existing realms can be edited and new realms can be added using the "New Realm" button.

#### Editing a game design > Editing or creating a realm
This will launch the Realm Designer, with a map grid of the specified size.
The map grid is surrounded by the various design tools.

#### Editing or creating a realm > Realm tools
These are found within the *Realm* tab of the tool pane.
You can set the optional realm start and completion messages.

![Realm tools](/Documentation/Designer/realm-tools.png)

#### Realm tools > Objectives
The objectives tool is used to create a set of objectives that must be completed in sequence before the game can be completed. The first objective must be to set the start location, and all other options are disabled until this step has been completed, at which point it becomes disabled and the other options are enabled. Existing objectives can be deleted from the main objectives tool, and new ones added by pressing the "Add Objective" button, which launches the "Add Objective" dialog.

#### Editing or creating a realm > Location tools
These are found within the "Location" tab of the tool pane.

#### Location tools > Edit location properties
The *Location properties* tool has tabs for displaying information about a map location, or its items or characters. Mousing-over a map location will display the relevant properties. Clicking in a map location will allow it to be edited. The map location border will go red and the Location properties tool title will change to *Edit location properties*. Clicking again will cancel edit mode for the current location, or clicking on another location will move straight to edit mode for the new location. When in edit mode, various properties on the *Edit location properties* tool will become editable.
On the *Overview* tab, the location name will be editable in location edit mode.

The *Items* tab displays an icon for each item in the current location. Mousing-over each will display its properties. Clicking on an item will allow it to be edited. The item border will go red and various properties will become editable. Clicking again will cancel edit mode for the current item, or clicking on another item will move straight to edit mode for the new item.

The *Characters* tab displays an icon for each character in the current location. Mouse-over and edit behaviour is the same as the Items tab.

#### Location tools > Location palette
The *Location palette* tool has tabs for the categories *Environment*, *Items* and *Characters* - for setting the type of landscape in a map location, or adding items and characters to map locations that have an environment set. Each tab presents a palette of the supported options in each category, and mousing-over each palette option will display its details.
Add a location to the map by dragging an item from the *Environment* tab onto an empty map location.
Delete a location by dragging it onto the waste basket.

Selecting a map location allows you add items and characters onto that map location by dragging them from the palette tool onto the map location.

Selecting the a *Characters* tab displays the *Character Inventory* section. You can add items to the inventory of a selected character by dragging them into the inventory from the Location items palette.

![Add character inventory](/Documentation/Designer/add-character-inventory.png)

[Add character inventory video](Documentation/Designer/add-character-inventory.mp4)

Delete a location item or character, or a character inventory item by dragging it onto the waste basket.

---
## Development guide

### Tools
- Editing the files - you can use a plain text editor such as NotePad++ on Windows or vi or gedit on Linux perfectly well. An integrated development environment (IDE) can make the task easier by allowing you advanced features such as code navigation and refactoring. Two examples are <a href="https://www.jetbrains.com/webstorm/">JetBrains WebStorm</a> which is free for students and open-source projects, and <a href="https://code.visualstudio.com/">Visual studio Code</a>.
- UI debugging and layout - any modern browser will have built-in development tools.

### Project layout
Include the MVC overview text?

#### assets
This is for static files that are needed by the web browser to enable client-side functionality. This can be javascript files to provide client-side interaction, css to control the appearance of your web pages, or images that are displayed in the pages.

*assets/images* - images used in the UI itself - controls, wastebasket etc. Images associated with gameplay are provided by the appropriate plugins (see the javascript section below).

*assets/js* QuestOfRealms uses JavaScript to control client-side interaction such as dragging and dropping items onto the realm designer map, selecting and editing items and characters, and for handling user input. Each screen will generally have its own javascript file.

assets/js/backend - game server and related utilities.

assets/js/dependencies - some OSS javascript that QuestOfRealms needs. This could be better deployed dynamically using grunt.

assets/js/gameeditor - javascript for the game editor screen.

assets/js/main - main.js (app launch and message hub) and index.js (for the main page).

assets/js/playgame - javascript for the game play screen.

assets/js/realmEditor - javascript for the realm editor screen.

assets/js/utils - general utils.

*assets/QuestOfRealms-plugins*
More on this below.

*assets/styles*
This is where the cascading style sheets are defined. These allow you to customize the appearance and layout of your web pages.

#### node_modules
The various OSS node modules required by QuestOfRealms. These are installed automatically based on the requirements specified in package.json.

#### views
The HTML for the screen layouts. Broken down per screen as with the javascript.

#### main.js
main.js is a special file for an electron app. It takes care of configuring the main window but it also acts as a message hub for electron IPC messages between screens.
In electron, data is transmitted between screens using IPC messages, but screens can't messsage each other directly. Instead, main.js must act as the hub for all messages.

#### package.json
This is where the dependencies on various OSS packages are configured. Such dependencies are then installed using "npm install".

### Architecture
Electron nodejs app, using jQuery for cross-browser DOM access, jQueryUI for some UI controls such as dialog boxes and accordions and tabbed panels.
The app uses the lightweight NeDB document database.

### Architecture > game designer

gameEditor.js

Data is loaded in response to an *editGame-data* event from main.js
displayAvailableRealms() called via loadAndDisplayAvailableRealms() builds the realm list table, and registers the button click handlers for each row.
displayGameDetails() called via loadAndDisplayGame() does the same thing for the "realm in game" table.

Clicking the edit button on one of the realms in the realm list table launches the realm editor via editRealmDesign() in realmUtils.js.
This sends an *edit-realm* IPC message to main.js (remember all IPC messages have to go via main.js).
This replaces the window contents with the specified page and sends an *editRealm-data* message once the page has finished loading.

### Architecture > realm designer

realmEditor.js

Data is loaded in response to an *editRealm-data* event from main.js
It loads details of the supported environments, items, characters, and objectives and populates the various tool menus on the screen with this info.
Note the use of async.waterfall() to ensure that a number of asynchronous ajax calls happen in sequence.
The aysnchronous nature of ajax (Asynchronous Javascript And Xml) calls means that you can't call them in sequence like normal functions. Instead you provide
each with a *callback function* which will be called when the ajax call completes. When you have a number of ajax calls that need to be invoked you can get into
a situation known as *callback hell*, when it is hard to manage the interactions between all the ajax calls. async.js makes this kind of orchestration much easier,
allowing much cleaner code.

There are a couple of popup windows associated with this screen - edit character properties and edit item properties. These are Electron dialog windows and
communicate using Electron IPC. The window (e.g. edit item properties) is launched by sending an *edit-item* message (with accompanying initialisation data)
to main.js. This launches the window and passes the initialisation data along in an *init* message.
When save is pressed on the edit item properties dialog, editIem.js passes the form data back in a *save-edit-item* message. main.js forwards the data
to realmEditor.js in an *editItem-data* message.

### Architecture > game play

playGame.js

This is launched by main.js in response to a *play-game* message from index.js. When the window loads, main.js sends a *playGame-data* message and
playGame.js uses async to perform various initialisation tasks in sequence. One of the first is to initialise a gameEngine which will handle most of
the in-game commands and is responsible for data management.

playGame.js uses a Backbone view (mView) to display the map based on data in a Backbone collection (g_locationData). g_locationData is initialised with
data retrieved from the game database by gameEngine.js

```
    mView = new LocationsView({ collection: g_locationData });
    if (g_currentRealmData.hasOwnProperty('mapLocations')) {
        g_locationData.reset(g_currentRealmData.mapLocations);
    }
```

From [the Backbone website](https://backbonejs.org/):

"Backbone.js gives structure to web applications by providing models with key-value binding and custom events, collections with a rich API of enumerable functions, views with declarative event handling, and connects it all to your existing API over a RESTful JSON interface."

We don't use the REST API interface in playGame.js - instead initialising the collection as described above.
The benefit of using Backbone is that we can update g_locationData at varions places in the code and the view will take care of rendering itself. 

Interaction with the game is via the command window. Query commands and handled locally based on data in g_gameData and g_currentRealmData.
Action commands (i.e. those that will update data) are handled by gameEngine. When gameEngine handles a command it returns a JSON structure containing the command
results. This is used by processMessage() to display the result to the user and to update g_gameData.

This playGame / gameEngine split would allow the game to be exapnded to support multiple players. In a multiplayer version of the game, gameEngine would run on a separate webserver. Game commands would be sent via AJAX requests and the results would be published to all players via socket.io messages.
There is an (unfinished) multiplayer version using this approach available at QuestOfRealms.

One of the first things playGame.js does is load the plugins for the game using loadDependencyData(). This is used for drawing the map, and for describing characters
and items. Plugins are discussed in more detail below.

### Architecture > plugins

QuestOfRealms is designed to allow modification using custom plugin modules. You can provide environments, items and characters via plugins.
Plugins are exported along with a game that uses them.

Plugins that you intend to use in the game designer should go under assets/QuestOfRealms-plugins. Plugins are named modules, which contain javascript files that implement the module. An *images* subdirectory contains any required images, which should be 50x50px. Two example modules - default and default2 - are provided.
Each javascript file exports a category, a collection of attributes, and an optional collection of action handlers.
Modules fall into three categories.

#### Environments

These have category: "environment" and attributes is a collection of named dictionaries as shown below.
The required attributes of each environment are *image* and *description*. *healthcost* is intended as a game enhancement to
add a cost of travelling about the realm, but is not currently implemented.

```
    category: "environment",
    attributes: {
        "grassland": {
            image: "grassland2.png",
            description: "Grassy plains.",
            healthCost: 1
        },
        "mountains": {
            image: "mountains3.png",
            description: "Not much grows here.",
            healthcost: 10
        }
    }
```

#### Items

These have category: "item" and attributes is a collection of named dictionaries as shown below.
The required attributes of each item are *image*, *description* and *damage*. *use* is currently only used to communicate the intended
use of this item to humans reading the file.

```
    category: "item",
    attributes: {
        "long sword": {
            use: "weapon",
            image: "longsword.png",
            description: "Useful against more powerful or armoured opponents.",
            damage: 10
        },
        "short sword": {
            use: "weapon",
            image: "shortsword.png",
            description: "Useful for close-quarters combat. Easily concealed.",
            damage: 5
        },
        ...
```

Both the Environments and items examples above are for modules that don't implement any behaviour, and so space has been saved by grouping multiple environment or item definitions into a single file. If you intend to implement behaviours too then use one js file per definition. Check food.js as an example.
Food has a handler for the *use* action. When you use a food item it increases your health.

#### Characters

These have category: "character" and attributes is a collection of named dictionaries as shown below.
The required attributes of each character are *image*, *description*, *health* and *damage*. *additional_info* is optional and is used to give a more detailed description of the character which will be displayed in the game designer. *drops* is a future feature and is not currently used.

```
    category: "character",
    attributes: {
        "Giant": {
            image: "Giant2.png",
            description: "Lumbering, stupid humanoids.",
            additional_info: "Can be found herding Iron Boars. Easily killed by Gryphons. They love gold.",
            health: 15,
            damage: 5,
            drops: ["leather"]
        }
    },
```

Characters will nearly always implement behaviours and so should be implemented as one character per js file.

### Architecture > plugins > handlers

Handlers are supported for every item or character-related action that can be typed into the command window. When a command is typed that affects an item or character, the gameEngine will check whether the associated js file supplies a handler for that action, and will call it if provided. If the item or character does not provide a handler then the game's default handler will be used.

Example - the "take from" handler in Giant.js

Typing "take food from Giant" will call this handler. This is a trivial handler, and simply returns the message "The giant will not give you the food, but will sell it to you for one coin."

Example - the "buy from" handler in Giant.js

Typing "buy food from Giant" will call this handler. This is a more complex handler as it examines game properties. It checks your inventory to see whether you can afford to buy the item, and if so returns a message telling the game to give you the item and deduct the fee from your inventory.
This leads on to:

### Architecture > plugins > handler parameters

The handler action handler functions are passed readonly parameters that can be used to influence their behaviour. The parameters depend on the object type.

#### Item handlers

Item handlers are passed the following parameters.

*item* - details of the item upon which the action is being performed. This gives the handler details of the item's own state.

*player* - details of the player performing the action.

*callback* - a function that should be called by the handler to return the result of the attempted operation.

The handler should pass a response to the callback function, as below.

```
    var resp = {
        description: {
            action: "use",
            success: true,                  // was it possible to use the object?
            message: "You feel better now." // description of the result (if suitable)
        },
        data: {}  // optional. See below.
    };
    callback(resp);
```

*description* is required for all handlers.

*data* varies by handler type.

*use* action data:

```
        data: {
            player: player,       // Optional - updated player. For example,
                                  // using food increases the player's health.
        }
```

*The game is trusting your handler not to mess up the player or the game with your return data.*

*take* action data:

Not applicable. *take* does not operate directly on the item and so there is no corresponding action handler.

*drop* action data:

Not applicable. *drop* does not operate directly on the item and so there is no corresponding action handler.

#### Character handlers

Character handlers are passed the following parameters.

*character* - details of the character upon which the action is being performed. This gives the handler details of the character's own state.

*object* - if applicable - details of the object involved in the action. e.g. the sword in "give sword to Giant".
*fight* handlers are not passed this parameter, but *fight for* handlers are.

*player* - details of the player performing the action.

*callback* - a function that should be called by the handler to return the result of the attempted operation.

The handler should pass a response to the callback function, as below.

```
    var resp = {
        description: {
            action: "buy from",
            success: true,                                                  // was it possible to perform the action?
            message: message: "The Giant sold you the " + object.type + "." // description of the result (if suitable)
        },
        data: {}  // optional. See below.
    };
    callback(resp);
```

*description* is required for all handlers.

*data* varies by handler type.

*give* action data:

Not supported. No need to return a data object.
The game will take care of transferring ownership for you. Do not update the player or character yourself.

*take from* action data:

Not supported. No need to return a data object.

*buy* action data:

If the purchase was successful, return details of the payment. The game will take care of making the payment for you.
Do not update the player or character yourself.

```
    data: {
        payment: payment
    }
```

*fight* action data:

If the fight was successful, return the new player and character health values. The default fight mechanics are that each fight is a
single engagement, resulting in the player and character health values each being reduced the their opponent's damage value although
you are free to implement different rules in your action handler - just calculate and return the new health values as below.
The game will take care of updating the player and character for you, and will decide which is the winner. This decision is based
upon:
a) If one combatant dies then the other is the winner.
b) If neither dies, then the one which inflicted the higher percentage damage is the winner.

```
    data: {
        playerHealth: 10,     // The player's health after the fight
        characterHealth: 5    // The character's health after the fight
    }
```

*fight for* action data:

As for *fight*.

The game is trusting your handler not to mess up the player or the game with your return data.

## Examples
Some example games that you can open in the editor and experiment with can be found in

QuestOfRealms-desktop\example_games\designer

Copy the designer directory to

%AppData%\Roaming\questofrealms-desktop\QuestOfRealms

on windows, or

~/.config/questofrealms-desktop/QuestOfRealms

on Linux.

Ready-to-play game examples can be found in 

QuestOfRealms-desktop\example_games\exported_games

Use the game import feature to import them.
