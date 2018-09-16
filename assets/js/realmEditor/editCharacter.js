/**
 * Created by Simon on 16/09/2018.
 * This file implements the interactions of the edit character dialog.
 * (c) Simon Logan
 */

window.$ = window.jQuery = require('jquery');
const electron = require('electron')
const path = require('path')
const remote = electron.remote
const ipc = electron.ipcRenderer

$('#cancelBtn').on('click', function() {
    var window = remote.getCurrentWindow();
    window.close();
});

$('#saveBtn').on('click', function() {
    var data = {'name': $('#characterName').val(),
                'description': $('#characterDescription').val(),
                'addInfo': $('#characterAddInfo').val(),
                'damage': $('#characterDamage').val(),
                'health': $('#characterHealth').val(),
                'drops': $('#characterDrops').val()};
    ipc.send('save-edit-character', data);
    var window = remote.getCurrentWindow();
    window.close();
});

ipc.on('init', function (event, args) {
   console.log('editCharacter.js init: ' + JSON.stringify(args));
   ipc.send('logmsg', 'editCharacter.js init: ' + JSON.stringify(args));
   $('#characterName').val(args.name);
   $('#characterType').val(args.type);
   $('#characterDescription').val(args.description);
   $('#characterAddInfo').val(args.addInfo);
   $('#characterDamage').val(args.damage);
   $('#characterHealth').val(args.health);
   $('#characterDrops').val(args.drops);
})

