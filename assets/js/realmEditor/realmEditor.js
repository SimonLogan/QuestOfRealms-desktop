/**
 * Created by Simon on 05/02/2014.
 * This file implements the interactions for the realm editor page.
 * (c) Simon Logan 2014
 */

window.$ = window.jQuery = require('jquery');
require('jqueryui');
const async = require('async');
const ipc = require('electron').ipcRenderer;
const BrowserWindow = require('electron').remote.BrowserWindow;
const Backbone = require('backbone');
var Datastore = require('nedb');
var path = require('path');
var pluginsPath = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
var mgrPath = path.join(__dirname, "../../assets/js/backend/pluginManager.js");
var pluginMgr = require(mgrPath);;

// Constants

// Global data: options available in the various tabs in the palette window.
var envPaletteData;
var itemPaletteData;
var characterPaletteData;
var objectivePaletteData;

var db_collections = {
    questrealms: null
}

PaletteItemType = {
    ENV : 0,
    ITEM : 1,
    CHARACTER : 2
}

// The actual realm you will be editing.
var realmId;
var realmData;

// Backbone is a Model-View-Controller (MVC) framework. Extend the
// default Model with additional attributes that we need.
var MapLocation = Backbone.Model.extend({});

// Maintain a local collection of map locations. This will be synchronized (both ways)
// with the server and so allows multi-user access to the data.

var MapLocationCollection = Backbone.Collection.extend({
    // Extend the default collection with functionality that we need.
    model: MapLocation,
    sync: function() {
        ipc.send('logmsg', 'MapLocationCollection.sync()');

        // Filter out all the Backbone.Model fields. We just want to
        // save the raw data.
        realmData.mapLocations = this.models.map(thisModel => thisModel.attributes);
        saveRealm(function() {
            ipc.send('logmsg', 'realm saved()');
        });
    }
});

var locationData;
var mView;


var LocationsView = Backbone.View.extend({
    initialize: function () {
        this.listenTo(this.collection, 'reset', this.reset);
        this.listenTo(this.collection, 'add', this.add);
        this.listenTo(this.collection, 'remove', this.remove);
        this.listenTo(this.collection, 'change', this.change);
    },
    reset: function(data) {
        console.log("in view.reset:  " + JSON.stringify(data));
        data.forEach(function(item) {
            drawMapLocation(item);
        });
    },
    add: function(item) {
        if (item != undefined) {
            console.log("in view.add:  " + JSON.stringify(item));
            drawMapLocation(item);
        }
    },
    remove: function(item) {
        console.log("in view.remove: " + JSON.stringify(item));
        // This will find two entries if a map item is being dragged.
        // changedCells[0] is the original map location.
        // changedCells[1] is the new location (or the wastebasket).
        var changedCells = $('#mapTable td[id="cell_' + item.attributes.x + '_' + item.attributes.y + '"]').find('div');
        var oldCell = $(changedCells[0]);
        oldCell.html('');
        oldCell.closest('td').css('background-color', '');
        oldCell.removeClass('draggable mapItem');

        // Populate the relevant location properties if this location is currently
        // open in the properties window.
        // use $('#propertiesPanel').attr('data-id');  and look up the location
        // or add x and y attributes to the propertiesPanel.

        // No use as dragging unselects the selected item
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if ((selectedMapCell.length > 0) &&
            (selectedMapCell.attr('data-x') === item.attributes['x']) &&
            (selectedMapCell.attr('data-y') === item.attributes['y'])) {
            populateLocationDetails(item, true);
        }
    },
    change: function(item) {
        console.log("in view.change:  " + JSON.stringify(item));

        // Update the local display with the message data.
        var target = $('#mapTable td[id="cell_' + item.attributes.x + '_' + item.attributes.y + '"]').find('div');
        target.attr('data-env', item.attributes.type);

        if (item.attributes.startLocation !== undefined) {
            target.attr('data-startLocation', item.attributes.startLocation);
        }

        target.html('');
        target.append("<img src='" + pluginsPath + item.attributes.module + "/images/" + item.attributes.type + ".png'/>");

        // To allow it to be dragged to the wastebasket.
        target.addClass('draggable mapItem');
        target.draggable({helper: 'clone', revert: 'invalid'});

        // Populate the relevant location properties if this location is currently
        // open in the properties window.
        // use $('#propertiesPanel').attr('data-id');  and look up the location
        // or add x and y attributes to the propertiesPanel.
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if ((selectedMapCell.length > 0) &&
            (selectedMapCell.attr('data-x') === item.attributes['x']) &&
            (selectedMapCell.attr('data-y') === item.attributes['y'])) {
            populateLocationDetails(item, true);
        }
    }
});


// Called when the realm editor is loaded.
ipc.on('editRealm-data', function (event, data) {
    //ipc.send('logmsg', 'realmEditor.js:editRealm-data. data=' + JSON.stringify(data));
    realmId = data.id;
    $('#breadcrumb').attr('data-gameId', data.gameId);

   // Load details of the supported environments, items, characters, and objectives.
   // Populate the various tool menus on the screen with this info.
   // NOTE: Since we have accordion widgets inside tabs, we need to ensure the accordions
   // are populated before the tabs are activated, or the accordions in the items and
   // characters tabs won't display correctly.
   var x = new Date();
   console.log("********** starting editRealm-data " + x + "(" + Date.now() + ") **********")
   async.parallel([
        function(callback) {
            openDB(callback);
        },
        function(callback) {
            loadEnvPalette(callback);
        },
        function(callback) {
            loadItemsPalette(callback);
        },
        function(callback) {
            loadCharactersPalette(callback);
        },
        function(callback) {
            loadObjectivesPalette(callback);
        },
        function(callback) {
            loadRealm(realmId, function(error) {
                if (!error) {
                    $('#realmName').text("Editing realm " + realmData.name);

                    locationData = new MapLocationCollection();
                    mView = new LocationsView({collection: locationData});

                    if (realmData.hasOwnProperty('mapLocations')) {
                        locationData.reset(realmData.mapLocations);
                    }

                    callback(null);
                } else {
                    // Currently not used.
                    callback(error);
                }
            });
        }
    ],
    function(err, results) {
        // Create the tabbed panels
        $("#paletteInnerPanel").tabs();
        $("#propertiesInnerPanel").tabs();
        //if (!err) enableControls();
    });

    /*
    _.templateSettings = {
        interpolate : /\{\{(.+?)\}\}/g
    };
    */

    /* Dialogs */

    // The edit item dialog
   $("#editItemProperties").click(function() {
       console.log("editItem click");
       init_data = {'name': $('#itemName').val(),
                    'type': $('#itemType').text(),
                    'description': $('#itemDescription').text(),
                    'damage': $('#itemDamage').text()};

       // You can't send messages between renderers. You have to use main.js as a message gub.
       ipc.send('edit-item', init_data);
    });

    // Main is passing back the updated data when save is pressed on the edit item dialog.
    ipc.on('editItem-data', function (event, data) {
        console.log('realmEditor.js:editItem-data. data=' + JSON.stringify(data));
        ipc.send('logmsg', 'realmEditor.js:editItem-data. data=' + JSON.stringify(data));
        $('#itemName').val(data.name);
        $('#itemDescription').text(data.description);
        $('#itemDamage').text(data.damage);

        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        var thisCell = locationData.where({
            x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')});

        var selectedItem = $('#itemList').find(".propertiesPanelItem.selected");
        var itemToUpdate = thisCell[0].attributes.items[selectedItem.attr('data-index')];
        itemToUpdate.name = data.name.trim();
        itemToUpdate.description = data.description.trim();
        itemToUpdate.damage = data.damage;

		locationData.sync();
    });

    // The edit character dialog.
    $("#editCharacterProperties").click(function() {
        console.log("editCharacter click");
        init_data = {'name': $('#characterName').val(),
                     'type': $('#characterType').text(),
                     'description': $('#characterDescription').text(),
                     'addInfo': $('#characterAddInfo').text(),
                     'damage': $('#characterDamage').text(),
                     'health': $('#characterHealth').text(),
                     'drops': $('#characterDrops').text()
                    };
 
        // You can't send messages between renderers. You have to use main.js as a message gub.
        ipc.send('edit-character', init_data);
     });

    // Main is passing back the updated data when save is pressed on the edit character dialog.
    ipc.on('editCharacter-data', function (event, data) {
        console.log('realmEditor.js:editCharacter-data. data=' + JSON.stringify(data));
        ipc.send('logmsg', 'realmEditor.js:editCharacter-data. data=' + JSON.stringify(data));
        $('#characterName').val(data.name);
        $('#characterDescription').text(data.description);
        $('#characterAddInfo').text(data.addInfo);
        $('#characterDamage').text(data.damage);
        $('#characterHealth').text(data.health);
        $('#characterDrops').text(data.drops);

        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        var thisCell = locationData.where({
            x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')});

        var selectedCharacter = $('#characterList').find(".propertiesPanelItem.selected");
        var characterToUpdate = thisCell[0].attributes.characters[selectedCharacter.attr('data-index')];
        characterToUpdate.name = data.name.trim();
        characterToUpdate.description = data.description.trim();
        characterToUpdate.addInfo = data.addInfo.trim();
        characterToUpdate.damage = data.damage;
        characterToUpdate.health = data.health;
        characterToUpdate.drops = data.drops.trim();

		locationData.sync();
    });

    // The edit character inventory item dialog.
    $("#editInventoryItemProperties").click(function() {
        console.log("editInventoryItem click");
        init_data = {'name': $('#inventoryItemName').val(),
                     'type': $('#inventoryItemType').text(),
                     'description': $('#inventoryItemDescription').text(),
                     'damage': $('#inventoryItemDamage').text()};
 
        // You can't send messages between renderers. You have to use main.js as a message gub.
        ipc.send('edit-inventoryItem', init_data);
     });
 
     // Main is passing back the updated data when save is pressed on the edit item dialog.
     ipc.on('editInventoryItem-data', function (event, data) {
         console.log('realmEditor.js:editInventoryItem-data. data=' + JSON.stringify(data));
         ipc.send('logmsg', 'realmEditor.js:editInventoryItem-data. data=' + JSON.stringify(data));
         $('#inventoryItemName').val(data.name);
         $('#inventoryItemDescription').text(data.description);
         $('#inventoryItemDamage').text(data.damage);
 
         var selectedMapCell = $('#mapTable').find(".mapItem.selected");
         var thisCell = locationData.where({
             x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')});
 
         var selectedCharacter = $('#characterList').find(".propertiesPanelItem.selected");
         var newCharacter = thisCell[0].attributes.characters[selectedCharacter.attr('data-index')];

         var selectInventoryItem = $('#inventoryItemList').find(".propertiesPanelItem.selected");
         var inventoryItemToUpdate = newCharacter.inventory[selectInventoryItem.attr('data-index')];
         inventoryItemToUpdate.name = data.name.trim();
         inventoryItemToUpdate.description = data.description.trim();
         inventoryItemToUpdate.damage = data.damage;

         thisCell[0].attributes.characters[selectedCharacter.attr('data-index')] = newCharacter;
         locationData.sync();
     });

    // The add objective form.
    $("#addObjective").click(function() {
        console.log("addObjective click");

        // You can't send messages between renderers. You have to use main.js as a message gub.
        ipc.send('add-objective', objectivePaletteData);
    });

    // Main is passing back the updated data when save is pressed on the edit objective dialog.
    ipc.on('editObjective-data', function (event, data) {
        console.log('realmEditor.js:editObjective-data. data=' + JSON.stringify(data));
        ipc.send('logmsg', 'realmEditor.js:editObjective-data. data=' + JSON.stringify(data));

        // At present all objectives require parameters of some kind.
        if (data.saveParams.length === 0) {
            ipc.send('save-add-objective-result', {"success": false, "errorMsg": "Missing parameters."});
            return;
        }

        // Do some basic validation of some of the default objective types.
        // Since objectives are now defined by plugins, custom objectives
        // must be validated on the server.
        if (data.objectiveType === "Start at" || data.objectiveType === "Navigate to") {
           var thisCell = locationData.where({
              x: data.saveParams[0].value, y:data.saveParams[1].value});
    
           if (thisCell.length === 0) {
              ipc.send('save-add-objective-result', {"success": false, "errorMsg": "Invalid map location."});
              return;
           }
        }
    
        // Look up some additional info about the objective.
        if (!realmData.hasOwnProperty('objectives')) {
            realmData.objectives = [];
        }
    
        if (data.objectiveType === "Start at") {
           // Always put the "start at" objective first in the list to make
           // it clear that it has been set.
           if (realmData.objectives.length > 0 &&
               realmData.objectives[0].type === "Start at") {
               realmData.objectives.shift();
           }
    
           realmData.objectives.unshift({
              type: data.objectiveType,
              description: data.description,
              module: data.module,
              filename: data.filename,
              completed: false,
              params: data.saveParams
           });
        } else {
           // Otherwise add it to the end.
           realmData.objectives.push({
              type: data.objectiveType,
              description: data.description,
              module: data.module,
              filename: data.filename,
              completed: false,
              params: data.saveParams
           });
        }
    
        saveRealm(function() {
            ipc.send('logmsg', 'realm saved()');
            displayObjectives();
            ipc.send('save-add-objective-result', {"success": true});
        });
    });

    $(document).on('click', '.deleteObjective', function(e) {
        var target = $(e.target.closest('tr'));

        if (1 === realmData.objectives.length) {
            realmData.objectives = [];
        } else {
            realmData.objectives.splice(parseInt(target.attr('data-id')), 1);
        }

        saveRealm(function() {
            displayObjectives();
        });
    });

    // Navigate back.
    $(document).on('click', '#breadcrumb', function(e) {
        var args = {url: 'file://' + __dirname + '/../main/editGame.html',
                    data: {id: $('#breadcrumb').attr('data-gameId')}};
        ipc.send('edit-game', args);
    });
    
    $(document).on('mouseenter', '.paletteItem', function() {
        if ($(this).prop('id').length == 0)
            return;

        console.log("mouseenter .paletteItem");
        $(this).closest('div').css('border-color', 'red');

        var tabData = {};
        var activeTab = $('#paletteInnerPanel').tabs('option', 'active');
        switch (activeTab) {
            case PaletteItemType.ENV:
                tabData = {class: activeTab, entries: envPaletteData};
                break;
            case PaletteItemType.ITEM:
                tabData = {class: activeTab, entries: itemPaletteData};
                break;
            case PaletteItemType.CHARACTER:
                tabData = {class: activeTab, entries: characterPaletteData};
                break;
            default:
                console.log("Got invalid active tab " + activeTab);
                return;
        }

        var paletteItem = findPaletteItem(tabData.entries, $(this));
        populatePaletteDetails(tabData.class, paletteItem);
    });

    $(document).on('mouseleave', '.paletteItem', function() {
        console.log("mouseleave .paletteItem");
        $(this).closest('div').css('border-color', '');
        clearPaletteDetails();
    });

    // Show / edit map locations
    $(document).on('mouseenter', '#mapPanel', function() {});

    $(document).on('mouseleave', '#mapPanel', function() {});

    $(document).on('mouseenter', '.mapItem', function(e) {
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if (selectedMapCell.length === 0) {
            $('#currentCell').val($(this).prop('id'));
            $(this).closest('td').css('background-color', 'red');
            populateMapLocationDetails($(this), false);
        }
    });

    $(document).on('mouseleave', '.mapItem', function(e) {
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if (selectedMapCell.length === 0) {
            $('#currentCell').val('');
            $(this).closest('td').css('background-color', '');
            clearLocationDetails();
        }
    });

    $(document).on('mouseup', '.mapItem', function() {
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        if (selectedMapCell.length === 0) {
            if ($(this).is('.ui-draggable-dragging')) {
                // Don't show a red border if dragging a cell.
                $(this).closest('td').css('background-color', '');
            } else {
                // You clicked in a cell. Activate edit mode.
                $(this).closest('td').css('background-color', 'red');
                mapMode = "edit";
                $(this).addClass('selected');
                $('#propertiesPanelTitle').text("Edit location properties");
                populateMapLocationDetails($(this), false);
                enableLocationEdits();
            }
        } else if ($(this).attr('data-x') === selectedMapCell.attr('data-x') &&
                   $(this).attr('data-y') === selectedMapCell.attr('data-y')) {
            // Click again in the selected cell to cancel edit mode.
            selectedMapCell.closest('td').css('background-color', '');
            selectedMapCell.removeClass('selected');
            $('#propertiesPanelTitle').text("Location properties");
            disableLocationEdits();
        } else if ($(this).attr('data-x') !== selectedMapCell.attr('data-x') ||
                   $(this).attr('data-y') !== selectedMapCell.attr('data-y')) {
            // Click in a different cell to edit it.
            // First deselect the current edit cell.
            $('#currentCell').val('');
            selectedMapCell.closest('td').css('background-color', '');
            selectedMapCell.removeClass('selected');
            clearLocationDetails();

            // Then activate the new edit cell.
            $(this).closest('td').css('background-color', 'red');
            mapMode = "edit";
            $(this).addClass('selected');
            $('#propertiesPanelTitle').text("Edit location properties");
            populateMapLocationDetails($(this), false);
            enableLocationEdits();
        }
    });

    $(document).on('mouseup', '.propertiesPanelItem', function() {
        // Don't treat dropping an item as a regular click.
        if ($(this).hasClass('ui-draggable-dragging')) {
           return;
        }

        var listName = 'itemList';
        var populateFunction = populateLocationItemDetails;
        var clearFunction = clearLocationItemDetails;
        var enableEditsFunction = enableLocationItemEdits;
        var disableEditsFunction = disableLocationItemEdits;
        if ($('#propertiesInnerPanel').tabs('option', 'active') === 2)
        {
            if ($(this).closest('.elementList').is('#inventoryItemList')) {
                listName = 'inventoryItemList';
                populateFunction = populateInventoryItemDetails;
                clearFunction = clearInventoryItemDetails;
                enableEditsFunction = enableInventoryItemEdits;
                disableEditsFunction = disableInventoryItemEdits;
            } else {
                listName = 'characterList';
                populateFunction = populateLocationCharacterDetails;
                clearFunction = clearLocationCharacterDetails;
                enableEditsFunction = enableLocationCharacterEdits;
                disableEditsFunction = disableLocationCharacterEdits;
            }
        }

        var selectedItem = $('#' + listName).find(".propertiesPanelItem.selected");
        if (selectedItem.length === 0) {
            if ($(this).is('.ui-draggable-dragging')) {
                $(this).closest('div').css('border-color', '');
            } else {
                // Activate edit mode: $(this) is now the selectedItem.
                $(this).closest('div').css('border-color', 'red');
                $(this).addClass('selected');
                populateFunction($(this));
                enableEditsFunction();
            }
        } else if ($(this).attr('data-index') === selectedItem.attr('data-index')) {
            // Click again in the selected item to cancel edit mode.
            selectedItem.closest('div').css('border-color', '');
            selectedItem.removeClass('selected');
            clearFunction();
            disableEditsFunction();
        } else if ($(this).attr('data-index') !== selectedItem.attr('data-index')) {
            // Click in a different item to edit it.

            // First deselect the current edit item.
            selectedItem.closest('div').css('border-color', '');
            selectedItem.removeClass('selected');

            // Then activate the new edit item.
            $(this).closest('div').css('border-color', 'red');
            $(this).addClass('selected');
            populateFunction($(this));
            enableEditsFunction();
        }
    });

    $(document).on('mouseenter', '.propertiesPanelItem', function() {
        $(this).closest('div').css('border-color', 'red');

        if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
            if ($('#itemList').find(".propertiesPanelItem.selected").length === 0) {
                populateLocationItemDetails($(this));
            }
        }
        else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2)
        {
            if ($(this).closest('.elementList').is('#inventoryItemList')) {
                if ($('#inventoryItemList').find(".propertiesPanelItem.selected").length === 0) {
                    populateInventoryItemDetails($(this));
                }
            } else {
                if ($('#characterList').find(".propertiesPanelItem.selected").length === 0) {
                    populateLocationCharacterDetails($(this));
                }
            }
        }
    });

    $(document).on('mouseleave', '.propertiesPanelItem', function() {
        if (!$(this).hasClass('selected')) {
            $(this).closest('div').css('border-color', '');
        }

        if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
            if ($('#itemList').find(".propertiesPanelItem.selected").length === 0) {
                clearLocationItemDetails();
            }
        }
        else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2)
        {
            if ($(this).closest('.elementList').is('#inventoryItemList')) {
                if ($('#inventoryItemList').find(".propertiesPanelItem.selected").length === 0) {
                    clearInventoryItemDetails();
                }
            } else {
                if ($('#characterList').find(".propertiesPanelItem.selected").length === 0) {
                    clearLocationCharacterDetails();
                }
            }
        }
    });

    $(document).on('change', '.locationProperty', function() {
        console.log("locationProperty change");
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        var thisCell = locationData.where({
            x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')});

        thisCell[0].attributes.name = $('#locationName').val().trim();
        locationData.sync();

    });

    $(document).on('change', '.itemProperty', function() {
        console.log("itemProperty change");

        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        var thisCell = locationData.where({
            x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')});

        if ($(this).closest('div').parent().parent().find('.elementList').is('#inventoryItemList')) {
            var selectedCharacterIndex = $('#characterList').find(".propertiesPanelItem.selected").attr('data-index');
            var selectedItem = $('#inventoryItemList').find(".propertiesPanelItem.selected");
            var newItem = thisCell[0].attributes.characters[selectedCharacterIndex].inventory[selectedItem.attr('data-index')];
            newItem.name = $('#inventoryItemName').val().trim();
            newItem.description = $('#inventoryItemDescription').text();
            newItem.damage = $('#inventoryItemDamage').text();
            thisCell[0].attributes.characters[selectedCharacterIndex].inventory[selectedItem.attr('data-index')] = newItem;
        } else {
            var selectedItem = $('#itemList').find(".propertiesPanelItem.selected");
            var newItem = thisCell[0].attributes.items[selectedItem.attr('data-index')];
            newItem.name = $('#itemName').val().trim();
            newItem.description = $('#itemDescription').text();
            newItem.damage = $('#itemDamage').text();
            thisCell[0].attributes.items[selectedItem.attr('data-index')] = newItem;
        }

        locationData.sync();
    });

    $(document).on('change', '.characterProperty', function() {
        console.log("characterProperty change");
        var selectedCharacter = $('#characterList').find(".propertiesPanelItem.selected");
        var selectedMapCell = $('#mapTable').find(".mapItem.selected");
        var thisCell = locationData.where({
            x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')});

        var newCharacter = thisCell[0].attributes.characters[selectedCharacter.attr('data-index')];
        newCharacter.name = $('#characterName').val().trim();
        newCharacter.description = $('#characterDescription').text();
        newCharacter.additionalInfo = $('#characterAddInfo').text();
        newCharacter.damage = $('#characterDamage').text();
        newCharacter.health = $('#characterHealth').text();
        newCharacter.drops = $('#characterDrops').text();
        thisCell[0].attributes.characters[selectedCharacter.attr('data-index')] = newCharacter;
        locationData.sync();
    });
});
  


//
// Utility functions
//

function openDB(callback) {
    var path = require('path');
    var dbPath = path.join(__dirname, "../../db/");
    ipc.send('logmsg', 'openDB:' + dbPath);

    db_collections.questrealms = new Datastore({ filename: dbPath + '/questrealms.db', autoload: true });
    ipc.send('logmsg', "after openDB, db_collections.questrealm = " + db_collections.questrealms);

    db_collections.games = new Datastore({ filename: dbPath + '/games.db', autoload: true });
    ipc.send('logmsg', "after openDB, db_collections.games = " + db_collections.games);

    callback(null);
}


function drawMapLocation(item) {
    // Update the local display with the message data.
    var target = $('#mapTable td[id="cell_' + item.attributes.x + '_' + item.attributes.y + '"]').find('div');
    target.attr('data-env', item.attributes.type);
    target.attr('data-id', item.id);
    target.attr('data-module', item.attributes.module);
    target.html('');
    target.append("<img src='" + pluginsPath + item.attributes.module + "/images/" + item.attributes.type + ".png'/>");

    // To allow it to be dragged to the wastebasket.
    target.addClass('draggable mapItem');
    target.draggable({helper: 'clone', revert: 'invalid'});
}


function drawMapGrid(realmWidth, realmHeight)
{
    var mapTable = $('#mapTable');
    var tableContents = '';

    /* Being an html table, it has to be drawn from the top left to
       bottom right, but we want to label the cells with the origin
       at the bottom left.
    */

    // Allow an extra cell at the top and bottom of the table for the cell labels.
    realmWidth = parseInt(realmWidth);
    realmHeight = parseInt(realmHeight);
    
    for (var yCounter = realmHeight +1; yCounter >= 0; yCounter--) {
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<tr>';
        } else {
            tableContents += '<tr id="row_' + yCounter + '">';
        }

        // Allow an extra cell at the start of the row for the cell labels.
        tableContents += '<td style="border-style: none">';
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<div>&nbsp;</div>';
        } else {
            tableContents += '<div style="width:50px; height:50px; line-height:50px; text-align:center;">' + yCounter + '</div>';
        }
        tableContents += '</td>';

        // Draw the columns.
        for (var xCounter = 1; xCounter <= realmWidth; xCounter++) {
            // Draw the column labels in the top and bottom rows.
            if ((yCounter === 0) || (yCounter === realmHeight +1)) {
                tableContents += '<td style="border-style: none"><div style="width:50px; height:50px; line-height:50px; text-align:center;">' + xCounter + '</div></td>';
            } else {
                // Draw the regular map cells.
                tableContents += '<td id="cell_' + xCounter + "_" + yCounter + '"> ' +
                '<div class="droppable" style="width:50px; height:50px;" ' +
                'data-x="' + xCounter + '" data-y="' + yCounter + '" data-env=""></div>' +
                '</td>';
            }
        }

        // Allow an extra cell at the end of the row for the cell labels.
        tableContents += '<td style="border-style: none">';
        if ((yCounter === realmHeight +1) || (yCounter === 0)) {
            tableContents += '<div>&nbsp;</div>';
        } else {
            tableContents += '<div style="width:50px; height:50px; line-height:50px; text-align:center;">' + yCounter + '</div>';
        }
        tableContents += '</td>';

        tableContents += '</tr>';
    }
    mapTable.html(tableContents);
}


function addMapLocation(realmId, droppedItem, originalLocation, newLocation)
{
    var environment = (droppedItem.is('.paletteItem') ?
        droppedItem.attr('data-type') : droppedItem.attr('data-env'));

    // If dragging an existing map item, treat this as a move.
    // Simulate a move by creating and deleting. This will publish events for both.
    copiedItems = [];
    copiedCharacters = [];
    if (droppedItem.is('.mapItem')) {
        copiedItems = originalLocation[0].attributes.items;
        copiedCharacters = originalLocation[0].attributes.characters;
    }

    // An update doesn't work well for a location move, as only the
    // updated record gets published, meaning we can't remove
    // the old location from the map in a remote UI. Do an add + remove.
    // TODO: add + remove is ok for the game designer but in game mode
    // TODO: we'll need to find a way to handle updates properly.
    var newObj = locationData.add({
        x: newLocation.attr('data-x'),
        y: newLocation.attr('data-y'),
        type: environment,
        module: droppedItem.attr('data-module'),
        filename: droppedItem.attr('data-filename'),
        items: copiedItems,
        characters: copiedCharacters}, {wait: true});

    ipc.send('logmsg', 'addMapLocation(): updated locationData=' + JSON.stringify(locationData));

    if (droppedItem.is('.mapItem'))
        removeMapLocation(droppedItem.attr('data-x'), droppedItem.attr('data-y'));
}


function removeMapLocation(x, y)
{
    var models = locationData.where({x: x, y: y});

    if (models.length > 0) {
        models[0].destroy();
        locationData.remove(models[0]);
    }
}


function moveToWasteBasket(droppedItem)
{
    console.log("Dropped item onto wastebasket");
    if (droppedItem.is('.mapItem')) {
        removeMapLocation(droppedItem.attr('data-x'), droppedItem.attr('data-y'));
    }
    else if (droppedItem.is('.propertiesPanelItem')) {
        if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
            removeItemFromLocation(droppedItem);
        }
        else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2) {
            if (droppedItem.closest('div.elementList').is('#characterList')) {
                removeCharacterFromLocation(droppedItem);
            } else {
                removeCharacterInventoryItem(droppedItem);
            }
        }
    }
}


function droppedInventoryItem(droppedItem)
{
    console.log("Dropped inventory item");

    if (droppedItem.is('.paletteItem')) {
        console.log("dropped paletteItem");

        if (droppedItem.attr('data-category') === 'item') {
            console.log("Add inventory item");
            addInventoryItem(droppedItem);
        } else
            console.log("dropped unexpected item category: " + droppedItem.attr('data-category'));
    }
}


function addInventoryItem(droppedItem)
{
    var selectedMapCell = $('#mapTable').find(".mapItem.selected");
    var thisCell = locationData.where({
        x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')})[0];
    var selectedCharacter = $('#characterList').find('.propertiesPanelItem.selected');
    var characterData = thisCell.attributes.characters[selectedCharacter.attr('data-index')];

    if (characterData.inventory === undefined) {
        characterData.inventory = [];
    }

    var fullItemDetails = findPaletteItem(itemPaletteData, droppedItem);
    characterData.inventory.push(
        {
            type: droppedItem.attr('data-type'),
            module: droppedItem.attr('data-module'),
            filename: droppedItem.attr('data-filename'),
            name: '',
            description: fullItemDetails.description,
            damage: fullItemDetails.damage
        }
    );

    locationData.sync();
    displayLocationCharacterInventory(characterData);
}


function droppedMapItem(realmId, droppedItem, target)
{
    console.log("Dropped item onto map");
    var droppedItemOriginalLocation = locationData.where({
        x: droppedItem.attr('data-x'), y:droppedItem.attr('data-y')});

    var droppedItemNewLocation = locationData.where({
        x: target.attr('data-x'), y:target.attr('data-y')});

    if (droppedItemNewLocation.length === 0) {
        // Dropped an item onto an empty map location.
        // Create the new location if dragging an environment.
        if ((droppedItem.is('.paletteItem') && droppedItem.attr('data-category') === "environment") ||
            droppedItem.is('.mapItem'))
        {
            addMapLocation(realmId, droppedItem, droppedItemOriginalLocation, target)
        } else {
            console.error("can't drop item category '" +
                droppedItem.attr('data-category') +
                "' onto empty map location.");
        }
    } else {
        if (droppedItem.is('.paletteItem')) {
            console.log("dropped paletteItem");
            if (droppedItem.attr('data-category') === 'item')
                addItemToLocation(droppedItem, droppedItemNewLocation);
            else if (droppedItem.attr('data-category') === 'character')
                addCharacterToLocation(droppedItem, droppedItemNewLocation);
            else
                console.log("dropped unexpected item category: " + droppedItem.attr('data-category'));
        }
        else if (droppedItem.is('.propertiesPanelItem')) {
            console.log("dropped propertiesPanelItem");
            if ($('#propertiesInnerPanel').tabs('option', 'active') === 1) {
                changeItemLocation(droppedItem, droppedItemNewLocation);
            }
            else if ($('#propertiesInnerPanel').tabs('option', 'active') === 2) {
                changeCharacterLocation(droppedItem, droppedItemNewLocation);
            }
        }
        else {
            console.log("Dropped unexpected item type.");
        }
    }
}


function removeItemFromLocation(droppedItem)
{
    var selectedMapCell = $('#mapTable').find(".mapItem.selected");
    if (0 === selectedMapCell.length) {
       console.log("populateLocationCharacterDetails: no map item selected");
       return;
    }

    var thisCell = locationData.where({
        x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')})[0];

    thisCell.attributes.items.splice(droppedItem.attr('data-index'), 1);
    locationData.sync();
    locationData.trigger('change', thisCell);
}


function changeItemLocation(droppedItem, newLocation)
{
    var originalLocation = locationData.where({id: $('#propertiesPanel').attr('data-id')});
    var originalLocationItems = originalLocation[0].attributes['items'];
    var originalLocationItemIndex = droppedItem.attr('data-index');

    // Add the selected item to the new location.
    newLocation[0].attributes['items'].push(originalLocationItems[originalLocationItemIndex]);
    // Remove it from the original location.
    originalLocationItems.splice(originalLocationItemIndex, 1);
    locationData.sync();
}


function addItemToLocation(droppedItem, location)
{
    var fullItemDetails = findPaletteItem(itemPaletteData, droppedItem);
    location[0].attributes.items.push(
        {
            type: droppedItem.attr('data-type'),
            module: droppedItem.attr('data-module'),
            filename: droppedItem.attr('data-filename'),
            name: '',
            description: fullItemDetails.description,
            damage: fullItemDetails.damage
        }
    );

    locationData.sync();
    locationData.trigger('change', location[0]);
}


function removeCharacterFromLocation(droppedItem)
{
    var selectedMapCell = $('#mapTable').find(".mapItem.selected");
    if (0 === selectedMapCell.length) {
       console.log("populateLocationCharacterDetails: no map item selected");
       return;
    }

    var thisCell = locationData.where({
        x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')})[0];

    thisCell.attributes.characters.splice(droppedItem.attr('data-index'), 1);
    locationData.sync();
    locationData.trigger('change', thisCell);
}


function removeCharacterInventoryItem(droppedItem) {
    var selectedMapCell = $('#mapTable').find(".mapItem.selected");
    if (0 === selectedMapCell.length) {
       console.log("populateLocationItemDetails: no map item selected");
       return;
    }

    var thisCell = locationData.where({
        x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')})[0];

    var currentCharacter = $('#characterList').find('.propertiesPanelItem.selected');
    var characterData = thisCell.attributes.characters[currentCharacter.attr('data-index')];
    characterData.inventory.splice(droppedItem.attr('data-index'), 1);
    locationData.sync();
    locationData.trigger('change', thisCell);
    //displayLocationCharacterInventory(characterData);
}


function changeCharacterLocation(droppedItem, newLocation)
{
    var originalLocation = locationData.where({id: $('#propertiesPanel').attr('data-id')});
    var originalLocationCharacters = originalLocation[0].attributes['characters'];
    var originalLocationCharacterIndex = droppedItem.attr('data-index');

    // Add the selected item to the new location.
    newLocation[0].attributes['characters'].push(originalLocationCharacters[originalLocationCharacterIndex]);
    // Remove it from the original location.
    originalLocationCharacters.splice(originalLocationCharacterIndex, 1);
    locationData.sync();
}


function addCharacterToLocation(droppedCharacter, location)
{
   var fullCharacterDetails = findPaletteItem(characterPaletteData, droppedCharacter);
    location[0].attributes.characters.push(
        {
            type: droppedCharacter.attr('data-type'),
            module: droppedCharacter.attr('data-module'),
            filename: droppedCharacter.attr('data-filename'),
            name: '',
            description: fullCharacterDetails.description,
            additionalInfo: fullCharacterDetails.additional_info,
            damage: fullCharacterDetails.damage,
            health: fullCharacterDetails.health,
            drops: fullCharacterDetails.drops,
            npc: true
        }
    );

    locationData.sync();
    locationData.trigger('change', location[0]);
}


// Populate the properties window for the specified palette item.
// params:
//   paletteItem: the palette item.
function populatePaletteDetails(paletteItemClass, paletteItem)
{
    if (PaletteItemType.ENV === paletteItemClass) {
        $('#paletteEnvType').text(paletteItem.type);
        $('#paletteEnvDescription').text(paletteItem.description);
    }
    else if (PaletteItemType.ITEM === paletteItemClass) {
        $('#paletteItemType').text(paletteItem.type);
        $('#paletteItemDescription').text(paletteItem.description);
        $('#paletteItemDamage').text(paletteItem.damage);
    }
    else if (PaletteItemType.CHARACTER === paletteItemClass) {
        $('#paletteCharacterType').text(paletteItem.type);
        $('#paletteCharacterDescription').text(paletteItem.description);
        $('#paletteCharacterAddInfo').text(paletteItem.additional_info);
        $('#paletteCharacterHealth').text(paletteItem.health);
        $('#paletteCharacterDamage').text(paletteItem.damage);
        $('#paletteCharacterDrops').text(paletteItem.drops);
    }
}


function clearPaletteDetails()
{
    var activeTab = $('#paletteInnerPanel').tabs('option', 'active');
    switch (activeTab) {
        case PaletteItemType.ENV:
            $('#paletteEnvType').text('');
            $('#paletteEnvDescription').text('');
            break;

        case PaletteItemType.ITEM:
            $('#paletteItemType').text('');
            $('#paletteItemDescription').text('');
            $('#paletteItemDamage').text('');
            break;

        case PaletteItemType.CHARACTER:
            $('#paletteCharacterType').text('');
            $('#paletteCharacterDescription').text('');
            $('#paletteCharacterAddInfo').text('');
            $('#paletteCharacterHealth').text('');
            $('#paletteCharacterDamage').text('');
            $('#paletteCharacterDrops').text('');
            break;

        default:
            console.log("Got invalid active tab " + activeTab);
    }
}


function disableLocationItemEdits()
{
    $('#itemName').prop('disabled', true);
    $('#itemType').prop('disabled', true);
    $('#itemDescription').prop('disabled', true);
    $('#editItemProperties').prop('disabled', true).attr('src', '../../assets/images/pencil43-disabled.png');
}


function enableLocationItemEdits()
{
    $('#itemName').prop('disabled', false);
    $('#itemType').prop('disabled', false);
    $('#itemDescription').prop('disabled', false);
    $('#editItemProperties').prop('disabled', false).attr('src', '../../assets/images/pencil43.png');
}


function populateLocationItemDetails(item)
{
    var selectedMapCell = $('#mapTable').find(".mapItem.selected");
    if (0 === selectedMapCell.length) {
       console.log("populateLocationItemDetails: no map item selected");
       return;
    }

    var thisCell = locationData.where({
        x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')})[0];

    var itemData = thisCell.attributes.items[item.attr('data-index')];

    $('#itemName').val(itemData.name);
    $('#itemType').text(itemData.type);
    $('#itemDescription').text(itemData.description);
    $('#itemDamage').text(itemData.damage);
}


function clearLocationItemDetails()
{
    $('#itemName').val('');
    $('#itemType').text('');
    $('#itemDescription').text('');
}


function enableLocationCharacterEdits()
{
    $('#characterName').prop('disabled', false);
    $('#editCharacterProperties').prop('disabled', false).attr('src', '../../assets/images/pencil43.png');
}


function disableLocationCharacterEdits()
{
    $('#characterName').prop('disabled', true);
    $('#editCharacterProperties').prop('disabled', true).attr('src', '../../assets/images/pencil43-disabled.png');
}


function enableInventoryItemEdits()
{
    $('#inventoryItemName').prop('disabled', false);
    $('#editInventoryItemProperties').prop('disabled', false).attr('src', '../../assets/images/pencil43.png');
}


function disableInventoryItemEdits()
{
    $('#inventoryItemName').prop('disabled', true);
    $('#editInventoryItemProperties').prop('disabled', true).attr('src', '../../assets/images/pencil43-disabled.png');
}


function populateLocationCharacterDetails(character)
{
    var selectedMapCell = $('#mapTable').find(".mapItem.selected");
    if (0 === selectedMapCell.length) {
       console.log("populateLocationCharacterDetails: no map item selected");
       return;
    }

    var thisCell = locationData.where({
        x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')})[0];

    var characterData = thisCell.attributes.characters[character.attr('data-index')];

    // Character data
    $('#characterName').val(characterData.name);
    $('#characterType').text(characterData.type);
    $('#characterDescription').text(characterData.description);
    $('#characterAddInfo').text(characterData.additionalInfo);
    $('#characterDamage').text(characterData.damage);
    $('#characterHealth').text(characterData.health);
    $('#characterDrops').text(characterData.drops);

    // And its inventory, if it has any.
    if (characterData.inventory === undefined) {
       return;
    }

    displayLocationCharacterInventory(characterData);
}


function populateInventoryItemDetails(inventoryItem)
{
    var selectedMapCell = $('#mapTable').find(".mapItem.selected");
    if (0 === selectedMapCell.length) {
       console.log("populateLocationItemDetails: no map item selected");
       return;
    }

    var thisCell = locationData.where({
        x: selectedMapCell.attr('data-x'), y:selectedMapCell.attr('data-y')})[0];

    var currentCharacter = $('#characterList').find('.propertiesPanelItem.selected');
    var characterData = thisCell.attributes.characters[currentCharacter.attr('data-index')];
    var itemData = characterData.inventory[inventoryItem.attr('data-index')];

    $('#inventoryItemName').val(itemData.name);
    $('#inventoryItemType').text(itemData.type);
    $('#inventoryItemDescription').text(itemData.description);
    $('#inventoryItemDamage').text(itemData.damage);
}


function clearLocationCharacterDetails()
{
    $('#characterName').val('');
    $('#characterType').text('');
    $('#characterDescription').text('');
    $('#characterAddInfo').text('');
    $('#characterDamage').text('');
    $('#characterHealth').text('');
    $('#characterDrops').text('');

    clearCharacterInventory();
}


function clearInventoryItemDetails() {
    $('#inventoryItemName').val('');
    $('#inventoryItemType').text('');
    $('#inventoryItemDescription').text('');
    $('#inventoryItemDamage').text('');
}


// Populate the properties window for the specified location.
// params:
//   location: the mapLocation UI cell of interest.
//   allDetails: true shows all details. False shows only high-level details.
function populateMapLocationDetails(location, allDetails)
{
    var thisCell = locationData.where({
        x: location.attr('data-x'), y:location.attr('data-y')});

    populateLocationDetails(thisCell[0], allDetails);
}


function disableLocationEdits()
{
    $('#locationName').prop('disabled', true);
}


function enableLocationEdits()
{
    $('#locationName').prop('disabled', false);
}


// Populate the properties window for the specified location.
// params:
//   locationCollection: the collection of locations to search.
//   location: the mapLocation data object of interest.
//   allDetails: true shows all details. False shows only high-level details.
function populateLocationDetails(location, allDetails)
{
    if (location.attributes.name !== undefined)
        $('#locationName').val(location.attributes.name);

    $('#propertiesPanel').attr('data-id', location.id);
    $('#envType').text(location.attributes.type);
    $('#characterSummary').text(location.attributes.characters.length);
    $('#itemSummary').text(location.attributes.items.length);

    disableLocationEdits();

    displayLocationItems(location);
    displayLocationCharacters(location);
    disableLocationItemEdits();
    disableLocationCharacterEdits();
}


function clearLocationDetails()
{
    $('#propertiesPanel').removeAttr('data-id');
    $('#locationName').val('');
    $('#envType').text('');
    $('#characterSummary').text('');
    $('#itemSummary').text('');
    clearLocationItems();
    clearLocationCharacters();
}


function clearLocationItems()
{
    console.log("clearLocationItems found" + $('#itemList').find('.propertiesPanelItem').length)
    $('#itemList').find('.propertiesPanelItem').remove();
}


function clearLocationCharacters()
{
    console.log("clearLocationCharacters found" + $('#characterList').find('.propertiesPanelItem').length)
    $('#characterList').find('.propertiesPanelItem').remove();
    clearCharacterInventory();
}


function clearCharacterInventory()
{
    console.log("clearCharacterInventory")
    $('#inventoryItemList').find('.propertiesPanelItem').remove();
}


// Look up a drag & drop UI item in the palette data.
function findPaletteItem(dataSet, itemToFind) {
    var moduleName = itemToFind.attr('data-module');
    var moduleContents = dataSet.modules[moduleName];
    if (moduleContents === undefined) {
       return null; // The modulename was not found
    }

    var fileName = itemToFind.attr('data-filename');
    var fileContents = moduleContents[fileName];
    if (fileContents === undefined) {
       return null; // The filename was not found
    }

    for (var i = 0, len = fileContents.length; i < len; i++) {
        var thisContent = fileContents[i];
        if (thisContent.type === itemToFind.attr('data-type')) {
           return thisContent; // Return as soon as the object is found
        }
    }

    return null; // The object was not found
}


// Look up a data object in the palette data.
function findLocationItem(dataSet, itemToFind) {
    var moduleContents = dataSet.modules[itemToFind.module];
    if (moduleContents === undefined) {
       return null; // The modulename was not found
    }

    var fileContents = moduleContents[itemToFind.filename];
    if (fileContents === undefined) {
       return null; // The filename was not found
    }

    for (var i = 0, len = fileContents.length; i < len; i++) {
        var thisContent = fileContents[i];
        if (thisContent.type === itemToFind.type) {
           return thisContent; // Return as soon as the object is found
        }
    }

    return null; // The object was not found
}


function loadEnvPalette(callback) {
    ipc.send('logmsg', 'load env palette');
    try {
        envPaletteData = pluginMgr.findPlugins('environment');
        ipc.send('logmsg', 'found plugins:' + JSON.stringify(envPaletteData));

        var path = require('path');
        var fs = require('fs');
        var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");

        var target = $('#paletteEnvList');
        target.html('');
        var envNum = 1;

        // The are several ways to interate over a collection.
        // Dictionaries (envPaletteData.modules):
        //    $.each(envPaletteData.modules, function(moduleName) { ... });
        //       calls function for each key (in this case, moduleName) in the collection.
        //    for (var fileName in envPaletteData.modules[moduleName]) { ... }
        //       sets the fileName for each key (in this case, fileName) in the collection.
        // Arrays (envPaletteData.modules[moduleName][fileName]):
        //    plugins.modules['default']['environments.js'].forEach(function(item) { ... });
        //       calls function for each item (object) in the array.
        $.each(envPaletteData.modules, function(moduleName) {
            // Some left padding required to stop the accordion triangle overlapping the text.
            // I'm sure this can be sorted out with css somehow.
            var accordion = $("<h3>&nbsp;&nbsp;&nbsp;" + moduleName + "</h3>");
            accordion.appendTo(target);
            var childContainer = $("<div></div>");
            for (var fileName in envPaletteData.modules[moduleName]) {
                var thisEntry = envPaletteData.modules[moduleName][fileName];
                thisEntry.forEach(function(item) {
                    var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                    var html = "<div class='paletteItem draggable ui-widget-content' " +
                        "id='env_" + envNum++ + "' " +
                        "data-module='" + moduleName + "' " +
                        "data-filename='" + fileName + "' " +
                        // data-category is needed to allow the category
                        // to be identified when dropping an item onto the map.
                        "data-category='" + envPaletteData.category + "' " +
                        "data-type='" + item.type + "' " +
                        "><img src='" + pathroot + "/" + moduleName + "/images/" + item.image + "'/>";
                    html += "</div>";
                    var paletteItem = $(html);
                    paletteItem.draggable({helper: 'clone', revert: 'invalid'});
                    paletteItem.appendTo(container);
                    container.appendTo(childContainer);
                });
                childContainer.appendTo(target);
            }
        });

        $(target).accordion();
        callback(null);
    } catch(error) {
        ipc.send('logmsg', 'caught error: ' + error);
        callback(error);
    }
}


function loadItemsPalette(callback) {
    ipc.send('logmsg', 'load items palette');
    try {
        itemPaletteData = pluginMgr.findPlugins('item');
        ipc.send('logmsg', 'found plugins:' + JSON.stringify(itemPaletteData));

        var path = require('path');
        var fs = require('fs');
        var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");

        var target = $('#paletteItemList');
        target.html('');
        var itemNum = 1;

        // The are several ways to interate over a collection.
        // Dictionaries (itemPaletteData.modules):
        //    $.each(itemPaletteData.modules, function(moduleName) { ... });
        //       calls function for each key (in this case, moduleName) in the collection.
        //    for (var fileName in itemPaletteData.modules[moduleName]) { ... }
        //       sets the fileName for each key (in this case, fileName) in the collection.
        // Arrays (itemPaletteData.modules[moduleName][fileName]):
        //    plugins.modules['default']['environments.js'].forEach(function(item) { ... });
        //       calls function for each item (object) in the array.
        $.each(itemPaletteData.modules, function(moduleName) {
            // Some left padding required to stop the accordion triangle overlapping the text.
            // I'm sure this can be sorted out with css somehow.
            var accordion = $("<h3>&nbsp;&nbsp;&nbsp;" + moduleName + "</h3>");
            accordion.appendTo(target);
            var childContainer = $("<div></div>");
            for (var fileName in itemPaletteData.modules[moduleName]) {
                var thisEntry = itemPaletteData.modules[moduleName][fileName];
                thisEntry.forEach(function(item) {
                    var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                    var html = "<div class='paletteItem draggable ui-widget-content' " +
                        "id='item_" + itemNum++ + "' " +
                        "data-module='" + moduleName + "' " +
                        "data-filename='" + fileName + "' " +
                        // data-category is needed to allow the category
                        // to be identified when dropping an item onto the map.
                        "data-category='" + itemPaletteData.category + "' " +
                        "data-type='" + item.type + "' " +
                        "><img src='" + pathroot + "/" + moduleName + "/images/" + item.image + "'/>";
                    html += "</div>";
                    var paletteItem = $(html);
                    paletteItem.draggable({helper: 'clone', revert: 'invalid'});
                    paletteItem.appendTo(container);
                    container.appendTo(childContainer);
                });
                childContainer.appendTo(target);
            }
        });

        $(target).accordion();
        callback(null);
    } catch(error) {
        ipc.send('logmsg', 'caught error: ' + error);
        callback(error);
    }
}


function loadCharactersPalette(callback) {
    ipc.send('logmsg', 'load characters palette');
    try {
        characterPaletteData = pluginMgr.findPlugins('character');
        ipc.send('logmsg', 'found plugins:' + JSON.stringify(characterPaletteData));

        var path = require('path');
        var fs = require('fs');
        var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");

        var target = $('#paletteCharactersList');
        target.html('');
        var characterNum = 1;

        // The are several ways to interate over a collection.
        // Dictionaries (characterPaletteData.modules):
        //    $.each(characterPaletteData.modules, function(moduleName) { ... });
        //       calls function for each key (in this case, moduleName) in the collection.
        //    for (var fileName in characterPaletteData.modules[moduleName]) { ... }
        //       sets the fileName for each key (in this case, fileName) in the collection.
        // Arrays (characterPaletteData.modules[moduleName][fileName]):
        //    plugins.modules['default']['environments.js'].forEach(function(item) { ... });
        //       calls function for each item (object) in the array.
        $.each(characterPaletteData.modules, function(moduleName) {
            // Some left padding required to stop the accordion triangle overlapping the text.
            // I'm sure this can be sorted out with css somehow.
            var accordion = $("<h3>&nbsp;&nbsp;&nbsp;" + moduleName + "</h3>");
            accordion.appendTo(target);
            var childContainer = $("<div></div>");
            for (var fileName in characterPaletteData.modules[moduleName]) {
                var thisEntry = characterPaletteData.modules[moduleName][fileName];
                thisEntry.forEach(function(character) {
                    var container = $("<div style='display: inline-block; padding: 2px;'></div>");
                    var html = "<div class='paletteItem draggable ui-widget-content' " +
                        "id='char_" + characterNum++ + "' " +
                        "data-module='" + moduleName + "' " +
                        "data-filename='" + fileName + "' " +
                        // data-category is needed to allow the category
                        // to be identified when dropping an item onto the map.
                        "data-category='" + characterPaletteData.category + "' " +
                        "data-type='" + character.type + "' " +
                        "><img src='" + pathroot + "/" + moduleName + "/images/" + character.image + "'/>";
                    html += "</div>";
                    var paletteItem = $(html);
                    paletteItem.draggable({helper: 'clone', revert: 'invalid'});
                    paletteItem.appendTo(container);
                    container.appendTo(childContainer);
                });
                childContainer.appendTo(target);
            };
        });

        $(target).accordion();
        callback(null);
    } catch(error) {
        ipc.send('logmsg', 'caught error: ' + error);
        callback(error);
    }
}


function loadObjectivesPalette(callback) {
    ipc.send('logmsg', 'load objective palette');
    try {
        objectivePaletteData = pluginMgr.findPlugins('objective');
        ipc.send('logmsg', 'found plugins:' + JSON.stringify(objectivePaletteData));
        callback(null);
    } catch(error) {
        ipc.send('logmsg', 'caught error: ' + error);
        callback(error);
    }
}


function loadRealm(realmId, callback) {
    ipc.send('logmsg', 'load realm ' + realmId);

    db_collections.questrealms.find({_id: realmId}, function (err, data) {
        ipc.send('logmsg', "loadRealm found data: " + JSON.stringify(data));
        realmData = data[0];

        //$('#realmName').text("Realm Designer: Editing realm " + realmData.name);
        drawMapGrid(realmData.width, realmData.height);

        // Handle and item that was dragged and dropped. This could be:
        // 1. An item from the palette dropped onto the grid.
        // 2. An item moved in the grid.
        // 3. An item (from palette or grid) dropped onto the wastebasket.
        $('.droppable').droppable({
            drop: function (event, ui) {
                var droppedItem = $(ui.draggable);
                var target = $(this);

                if (target.is('#wastebasket')) {
                    moveToWasteBasket(droppedItem);
                } else if (target.is('#inventoryItemList')) {
                    droppedInventoryItem(droppedItem);
                } else {
                    droppedMapItem(realmId, droppedItem, target);
                }
            }
        });

        displayObjectives();
        callback(null);
    });
}


function displayLocationItems(location)
{
    console.log(Date.now() + ' displayLocationItems at x:' + location.attributes['x'] + " y: " + location.attributes['y']);

    var path = require('path');
    var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
    var target = $('#itemList').html("");
    var itemIndex = 0;
    location.attributes.items.forEach(function(item) {
        var paletteItem = findLocationItem(itemPaletteData, item);
        var container = $("<div style='display: inline-block; padding: 2px;'></div>");
        var html = "<div class='propertiesPanelItem draggable ui-widget-content' " +
            "data-index='" + itemIndex++ + "' " +
            "><img src='" + pathroot + item.module + "/images/" + paletteItem.image + "'/>";
        html += "</div>";
        var locationItem = $(html);
        locationItem.draggable({helper: 'clone', revert: 'invalid'});
        locationItem.appendTo(container);
        container.appendTo(target);
    });

    $('#itemName').prop('disabled', true);
}


function displayLocationCharacters(location)
{
    console.log(Date.now() + ' displayLocationCharacters at x:' + location.attributes['x'] + " y: " + location.attributes['y']);

    // This will be triggered by mousing over a maplocation, or by updating the inventory of a
    // selected character. Work out whether the details for a particular character are
    // currently being displayed, and re-display the same character after the update.
    var selectedCharacter = $('#characterList').find(".propertiesPanelItem.selected");

    var path = require('path');
    var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
    var target = $('#characterList').html("");
    var characterIndex = 0;
    location.attributes.characters.forEach(function(character) {
        var paletteItem = findLocationItem(characterPaletteData, character);
        var container = $("<div style='display: inline-block; padding: 2px;'></div>");
        var html = "<div class='propertiesPanelItem draggable ui-widget-content' " +
            "data-index='" + characterIndex++ + "' " +
            "><img src='" + pathroot + character.module + "/images/" + paletteItem.image + "'/>";
        html += "</div>";
        var locationCharacter = $(html);
        locationCharacter.draggable({helper: 'clone', revert: 'invalid'});
        locationCharacter.appendTo(container);
        container.appendTo(target);
    });

    $('#characterName').prop('disabled', true);

    if (selectedCharacter.length === 1) {
        // The original html element has been replaced above. Locate the new one
        // by data-index.
        selectedCharacter = $('#characterList').find(".propertiesPanelItem[data-index='" +
            selectedCharacter.attr('data-index') + "']");
        selectedCharacter.css('background-color', 'red');
        selectedCharacter.addClass('selected');

        // And its inventory, if it has any.
        var characterData = location.attributes.characters[parseInt(selectedCharacter.attr('data-index'))];
        if (characterData.inventory === undefined) {
            return;
        }

        displayLocationCharacterInventory(characterData);
    }
}


function displayLocationCharacterInventory(character)
{
    console.log(Date.now() + ' displayLocationCharacterInventory');

    var path = require('path');
    var pathroot = path.join(__dirname, "../../assets/QuestOfRealms-plugins/");
    var target = $('#inventoryItemList').html("");
    var itemIndex = 0;
    character.inventory.forEach(function(item) {
        var paletteItem = findLocationItem(itemPaletteData, item);
        var container = $("<div style='display: inline-block; padding: 2px;'></div>");
        var html = "<div class='propertiesPanelItem draggable ui-widget-content' " +
            "data-index='" + itemIndex++ + "' " +
            "><img src='" + pathroot + item.module + "/images/" + paletteItem.image + "'/>";
        html += "</div>";
        var inventoryItem = $(html);
        inventoryItem.draggable({helper: 'clone', revert: 'invalid'});
        inventoryItem.appendTo(container);
        container.appendTo(target);
    });

    $('#inventoryItemName').prop('disabled', true);
}


function displayObjectiveDetails(item) {
    var description = "";

    $.each(item.params, function(thisParam){
       description += item.params[thisParam].name + ":" + item.params[thisParam].value + ", ";
    });

    description = description.substr(0, description.lastIndexOf(", "));
    return description;
}


function displayObjectives()
{
    console.log(Date.now() + ' displayObjectives');
    var target = $('#objectiveList').html("");
    var html = "";

    var i=0;
    if (realmData.hasOwnProperty('objectives')) {
        realmData.objectives.forEach(function(item) {
            html += "<tr data-id='" + (i++) + "'>";
            html += "<td class='objectiveName' data-value='" + item.type + "'>" + item.type + "</td>";
            html += "<td class='objectiveDetails'>" + displayObjectiveDetails(item) + "</td>";
            html += "<td><input class='deleteObjective' type='image' src='../../assets/images/wastebasket.png' alt='Delete' width='14' height='14'></td>";
            html += "</tr>";
        });
    }

    target.append(html);
}


function saveRealm(callback)
{
    console.log(Date.now() + ' saveRealm');
    db_collections.questrealms.update({_id: realmId}, realmData, {}, function (err, numReplaced) {
        console.log("saveRealm err:" + err);
        console.log("saveRealm numReplaced:" + numReplaced);
        callback(null);
    });
}
