/**
 * This file implements the interactions of the player name dialog.
 * (c) Simon Logan 2019
 */

window.$ = window.jQuery = require('jquery');
const electron = require('electron')
//const path = require('path')
const remote = electron.remote
const ipc = electron.ipcRenderer

$('#cancelBtn').on('click', function() {
    var window = remote.getCurrentWindow();
    window.close();
});

$('#saveBtn').on('click', function() {
    var data = {'name': $('#itemName').val()};
    ipc.send('save-player-name', data);
    var window = remote.getCurrentWindow();
    window.close();
});

ipc.on('init', function (event, args) {
   console.log('playerName.js init: ' + JSON.stringify(args));
   ipc.send('logmsg', 'playerName.js init: ' + JSON.stringify(args));
   $('#itemName').val(args.name);
})

