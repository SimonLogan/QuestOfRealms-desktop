/**
 * Created by Simon on 06/11/2018.
 * This file implements a shareable db wrapper.
 * Require this module everywhere you need access to the db.
 * (c) Simon Logan
 */

// https://medium.freecodecamp.org/requiring-modules-in-node-js-everything-you-need-to-know-e7fbd119be8

var Datastore = require('nedb');
var db_collections = {};

module.exports = {
    openDesignerDB: function (callback) {
        var electron = require('electron');
        const app = electron.remote.app;

        var dbPath = app.getPath('userData') + "/QuestOfRealms/designer/db/";
        console.log("opendb path " + dbPath + ", __dirname " + __dirname);

        db_collections.questrealms = new Datastore({ filename: dbPath + '/questrealms.db', autoload: true });
        console.log("openDB loaded db_collections.questrealm = " + db_collections.questrealms);

        db_collections.games = new Datastore({ filename: dbPath + '/games.db', autoload: true });
        console.log("openDB, loaded db_collections.games = " + db_collections.games);

        callback(null);
    },
    openGameDB: function (callback, dbPath = null) {
        console.log("opendb path " + dbPath + ", __dirname " + __dirname);

        db_collections.questrealms = new Datastore({ filename: dbPath + '/questrealms.db', autoload: true });
        console.log("openDB loaded db_collections.questrealm = " + db_collections.questrealms);

        db_collections.game = new Datastore({ filename: dbPath + '/game.db', autoload: true });
        console.log("openDB, loaded db_collections.game = " + db_collections.game);

        callback(null);
    },
    getDBs: function () {
        return db_collections;
    }
};
