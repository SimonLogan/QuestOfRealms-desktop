/**
 * Created by Simon on 05/02/2017.
 * This file implements shared realm code.
 * (c) Simon Logan
 */

const path = require('path');


// The "Edit" button was clicked on one of the Realm Designs table rows.
function editRealmDesign(target) {
    // Build a URL to invoke the realm editor, passing the id of the row that
    // was clicked. The jQuery selector target.closest('tr') traverses the
    // parents of the element that was clicked until it finds one of type "<tr>".
    // "window.location =" will redirect the user to the new web page. In this case
    // the "/editRealm" route (in config/routes.js) will render the questRealm/editRealm
    // view instead of returning JSON data. This view will pass the realm data to
    // views/questRealm/editRealm.ejs where it can be referenced using template parameters
    // when drawing the page.

    var args = {url: 'file://' + __dirname + '/../QuestRealm/editRealm.html',
                data: {id:target.closest('tr').attr('id')}};
    if ($('#gameId').length) {
       // The gameId is for the breadcrumb trail to allow you to come back to the
       // referring page. The game editor will pass this. The front page won't.
       args.data.gameId = $('#gameId').val();
    }

    ipc.send('edit-realm', args);
}


// The "Delete" button was clicked on one of the Realm Designs table rows.
function deleteRealmDesign(target, db_collections) {
    // The name of the realm is contained in one of the other <td> elements
    // of the row that contains the button that was clicked. Since this is a
    // sibling of the <td> that contained the button, we use $(target.closest('tr')
    // to find the parent of the button's <td> and then search all its children
    // looking for its first <td> element, and taking the text it contains.
    var realmName = $(target.closest('tr').find('td')[0]).text();
    // Similar use of a jQuery selector to find the id of the realm to delete.
    var id = target.closest('tr').attr('id');

    // Show a dialog with "OK" and "Cancel" buttons. If you click "OK" it will call the
    // function below.
    if (confirm("Are you sure you want to delete realm " + realmName + "?")) {
        db_collections.questrealms.remove ({_id:id}, {});

        // Submit an AJAX POST request to the "/deleteRealm" route.
        /*
        $.post(
            '/deleteRealm',
            // passing in the id of the realm to delete.
            {id: id},
            // and when it completes, call this function.
            function (data) {
                // to re-display the Realm Designs table.
                loadAndDisplayAvailableRealms();
            }
        ).fail(function(res){
            // There was an error. Display a dialog to show it.
            alert("Error: " + JSON.parse(res.responseText).error);
        });
        */
    }
}


// The "Create!" button on the "New Realm Design" form was pressed.
function createRealmDesign(db_collections, callback) {
    // Select the values the user supplied using the id attributes of the relevant
    // screen fields.
    var realmName = $('#realmName').val().trim();
    var realmDesc = $('#realmDescription').val().trim();
    var realmWidth = $('#realmWidth').val();
    var realmHeight = $('#realmHeight').val();
    var createDate = new Date();

    // Do it here for now.
    db_collections.questrealms.find({name : realmName}, function(err, realms) {
        console.log("createRealmDesign(" + realmName + ") found: " + JSON.stringify(realms));

        if (0 == realms.length) {
            console.log("Create new realm");
            var newRealm = {
                name: realmName,
                description: realmDesc,
                width: realmWidth,
                height: realmHeight,
                updatedAt: createDate
            }

            db_collections.questrealms.insert(newRealm);
            callback();
        }
    });


    // =========================================================
    // Submit an AJAX POST request to create the realm.
    // This is how the server version does it.
    /*
    $.post(
        '/createRealm',
        // passing in the required information
        {
            name: realmName,
            description: realmDesc,
            width: realmWidth,
            height: realmHeight
        },
        // and if the creation is successful, launch the realm editor for the new realm.
        function (data) {
            window.location = "/editRealm?id=" + data.id + "&gameId=" + $('#gameId').val();
        }
    ).fail(function(res){
        alert("Error: " + JSON.parse(res.responseText).error);
    });
    */

    // Alternatively, use an electron-worker process. Not sure if this
    // is really needed.
    /*
    console.log("in createRealmDesign");
    var electronWorkers = require('electron-workers')({
       pathToElectron: path.join(__dirname, '../../node_modules/electron/dist/electron.exe'),
       connectionMode: 'ipc',
       pathToScript: path.join(__dirname, '../../assets/js/backend/questRealmController.js'),
       timeout: 5000,
       numberOfWorkers: 1
    });

    console.log("starting worker");
    electronWorkers.start(function(startErr) {
       if (startErr) {
          return console.error(startErr);
       }
   
       // `electronWorkers` will send your data in a POST request to your electron script
       electronWorkers.execute({ someData: 'someData' }, function(err, data) {
          if (err) {
             return console.error(err);
          }
   
          console.log("execute response: " + JSON.stringify(data)); // { value: 'someData' }
          electronWorkers.kill(); // kill all workers explicitly
       });
    });
    */
}
