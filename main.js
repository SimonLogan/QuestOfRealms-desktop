/**
 * The game editor main process.
 * Created by Simon on 22/07/2018.
 * (c) Simon Logan
 */

const {app, BrowserWindow, Menu, ipcMain} = require('electron');
const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;


function createWindow (html_path) {
  // Create the browser window.
  win = new BrowserWindow({width: 1200, height: 800})

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'views/main/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  var menu = Menu.buildFromTemplate([
    {
        label: 'Create',
        submenu: [
              {
                  label: 'New Realm',
                  click() {
                      shell.openExternal('http://coinmarketcap.com')
                  }
              },
              {type: 'separator'},
              {
                  label: 'Exit',
                  click() {
                      app.quit()
                  }
              }
        ]
    },
    {
        label: 'Info'
    }
  ])

  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Handle communication from other pages.

ipcMain.on('edit-realm', (event, args) => {
  console.log("Received edit-realm. args:" + JSON.stringify(args));
  win.webContents.once('did-finish-load', function() {
    win.webContents.send('editRealm-data', args.data);
    win.webContents.openDevTools();
  });
  win.loadURL(args.url);
});

ipcMain.on('frontpage', (event, args) => {
  console.log("Received frontpage.");
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'views/main/index.html'),
    protocol: 'file:',
    slashes: true
  }));
});

ipcMain.on('logmsg', (event, msg) => {
  console.log("Received logmsg: " + msg);
});

// You can't send ipc messages directly between renderers. Instead, main.js
// has to be the message hub. Launch the edit item dialog and pass on
// the initialisation data.
ipcMain.on('edit-item', (event, msg) => {
  console.log("Received edit-item: " + JSON.stringify(msg));

  const editItemModelPath = path.join('file://', __dirname, 'views/QuestRealm/editItem.html');
  let editItemDialog = new BrowserWindow({ frame: false, transparent: true, alwaysOnTop: true, width: 800, height: 600});
  editItemDialog.on('close', function() { editItemDialog = null });

  editItemDialog.webContents.once('did-finish-load', function() {
    console.log("editItemDialog did-finish-load");
    editItemDialog.webContents.send('init', msg);
    editItemDialog.webContents.openDevTools();
  });

  editItemDialog.loadURL(editItemModelPath);
  editItemDialog.show();
});

// Save pressed on the the edit item dialog. Pass the saved data
// back to the realm editor.
ipcMain.on('save-edit-item', (event, msg) => {
  console.log("Received save-edit-item: " + JSON.stringify(msg));
  win.webContents.send('editItem-data', msg);
});

ipcMain.on('edit-character', (event, msg) => {
  console.log("Received edit-character: " + JSON.stringify(msg));

  const editCharacterModelPath = path.join('file://', __dirname, 'views/QuestRealm/editCharacter.html');
  let editCharacterDialog = new BrowserWindow({ frame: false, transparent: true, alwaysOnTop: true, width: 800, height: 600});
  editCharacterDialog.on('close', function() { editCharacterDialog = null });

  editCharacterDialog.webContents.once('did-finish-load', function() {
    console.log("editCharacterDialog did-finish-load");
    editCharacterDialog.webContents.send('init', msg);
    editCharacterDialog.webContents.openDevTools();
  });

  editCharacterDialog.loadURL(editCharacterModelPath);
  editCharacterDialog.show();
});

// Save pressed on the the edit character dialog. Pass the saved data
// back to the realm editor.
ipcMain.on('save-edit-character', (event, msg) => {
  console.log("Received save-edit-character: " + JSON.stringify(msg));
  win.webContents.send('editCharacter-data', msg);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.