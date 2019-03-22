/**
 * Created by Simon on 16/09/2018.
 * This file implements the interactions of the edit item dialog.
 * (c) Simon Logan
 */

window.$ = window.jQuery = require('jquery');
const electron = require('electron')
const path = require('path')
const remote = electron.remote
const ipc = electron.ipcRenderer

$('#cancelBtn').on('click', function () {
    var window = remote.getCurrentWindow();
    window.close();
});

$('#saveBtn').on('click', function () {
    var data = {
        'name': $('#itemName').val(),
        'description': $('#itemDescription').val(),
        'damage': $('#itemDamage').val()
    };
    ipc.send('save-edit-item', data);
    var window = remote.getCurrentWindow();
    window.close();
});

ipc.on('init', function (event, args) {
    console.log('editItem.js init: ' + JSON.stringify(args));
    ipc.send('logmsg', 'editItem.js init: ' + JSON.stringify(args));
    $('#itemName').val(args.name);
    $('#itemType').val(args.type);
    $('#itemDescription').val(args.description);
    $('#itemDamage').val(args.damage);
})

