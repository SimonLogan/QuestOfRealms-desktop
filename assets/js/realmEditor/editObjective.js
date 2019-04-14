/**
 * Created by Simon on 29/07/2018.
 * This file implements the interactions of the edit objective dialog.
 * (c) Simon Logan
 */


window.$ = window.jQuery = require('jquery');
const electron = require('electron')
const remote = electron.remote
const ipc = electron.ipcRenderer

var objectivePaletteData;

$('#cancelBtn').on('click', function () {
    var window = remote.getCurrentWindow();
    window.close();
});

$('#saveBtn').on('click', function () {
    var target = $('#objectiveParamsPanel');
    var paramNames = target.find('td.detailsHeading');
    var paramValues = target.find('td input');
    var saveParams = [];
    $.each(paramNames, function (index) {
        saveParams.push({
            name: $(paramNames[index]).text(),
            value: $(paramValues[index]).val()
        });
    });

    // At present all objectives require parameters of some kind.
    if (saveParams.length === 0) {
        return;
    }

    var selection = $('#objectiveChoice').find('option:selected');
    var data = {
        'objectiveType': selection.text(),
        'module': selection.attr('data-module'),
        'filename': selection.attr('data-filename'),
        'description': selection.attr('title'),
        'saveParams': saveParams
    };

    // We need to validate the save data before closing the window.
    // The realm editor will return a status, after which the
    // window can be closed or display an error message.
    ipc.send('save-add-objective', data);
});

$('#objectiveChoice').change(function () {
    var dropdown = $('#objectiveChoice');
    var selection = dropdown.find('option:selected');

    // Disable the save button if an invalid option is selected.
    if (selection.attr('disabled') === 'disabled') {
        $("#saveBtn").prop('disabled', true);
    } else {
        $("#saveBtn").prop('disabled', false);
    }

    var selectedObjectiveType = selection.text();
    var moduleName = selection.attr('data-module');
    var fileName = selection.attr('data-filename');
    var module = objectivePaletteData.modules[moduleName];
    var objective = module[fileName][selectedObjectiveType];

    var html = "<table>";
    objective.parameters.forEach(function (param) {
        html += "<tr><td class='detailsHeading'>" + param.name + "</td>";
        html += "<td><input type='text'/></td></tr>";
    });
    html += "</table>";
    $('#objectiveParamsPanel').html(html);
});

ipc.on('init', function (event, args) {
    console.log('editObjective.js init: ' + JSON.stringify(args));
    ipc.send('logmsg', 'editObjective.js init: ' + JSON.stringify(args));

    var html = "<option value='choose' title='choose' disabled selected>Choose</option>";

    // The are several ways to interate over a collection.
    // Dictionaries (objectivePaletteData.modules):
    //    $.each(objectivePaletteData.modules, function(moduleName) { ... });
    //       calls function for each key (in this case, moduleName) in the collection.
    //    for (var fileName in objectivePaletteData.modules[moduleName]) { ... }
    //       sets the fileName for each key (in this case, fileName) in the collection.
    // Arrays (objectivePaletteData.modules[moduleName][fileName]):
    //    for (var i=0; i<thisEntry.length; i++) { ... }
    //       iterates over each index number in the array.
    objectivePaletteData = args;
    $.each(objectivePaletteData.modules, function (moduleName) {
        for (var fileName in objectivePaletteData.modules[moduleName]) {
            var thisEntry = objectivePaletteData.modules[moduleName][fileName];
            var index = 0;
            $.each(thisEntry, function (objectiveName) {
                var objectiveData = thisEntry[objectiveName];
                html += "<option value='" + (index++) + "' ";
                html += "title='" + objectiveData.description + "' ";
                html += "data-module='" + moduleName + "' ";
                html += "data-filename='" + fileName + "' ";
                html += ">" + objectiveName + "</option>";
            });
        };
    });

    $('#objectiveChoice').html(html);
});

// Save result from realmEditor.js (via main.js) - success or error message.
ipc.on('save-result', function (event, args) {
    console.log('editObjective.js save-result: ' + JSON.stringify(args));
    ipc.send('logmsg', 'editObjective.js save-result: ' + JSON.stringify(args));

    if (!args.success) {
        alert(args.errorMsg);
        return;
    }

    var window = remote.getCurrentWindow();
    window.close();
});
