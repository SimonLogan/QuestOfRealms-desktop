/**
 * Manage access to plugin data.
 * (c) Simon Logan 2018
 */

module.exports = {

    // Find any plugins that match the specified category.
    // All subdirs of QuestOfRealms-plugins will be searched.
    // success: return plugins
    // failure: throws
    findPlugins: function(category) {
        var pluginData = {category:category, modules:{}};

        var path = require('path');
        var fs = require('fs');
        var pathroot = path.join(__dirname, "../../QuestOfRealms-plugins/");
        var topLevelDirsOrFiles = fs.readdirSync(pathroot);
        for (var index in topLevelDirsOrFiles) {
           var moduleName = topLevelDirsOrFiles[index];
           var topLevelDirOrFile = path.join(pathroot, moduleName);
           var stat = fs.statSync(topLevelDirOrFile);
           if (stat && stat.isDirectory()) {
              var nextLevelDirsOrFiles = fs.readdirSync(topLevelDirOrFile);
              for (var index2 in nextLevelDirsOrFiles) {
                 var filename = nextLevelDirsOrFiles[index2];
                 var nextLevelDirOrFile = path.join(topLevelDirOrFile, filename);
                 var stat = fs.statSync(nextLevelDirOrFile);
                 if (stat && !stat.isDirectory()) {
                    var thisItem = require(nextLevelDirOrFile);
                    if (thisItem.category === pluginData.category && thisItem.attributes) {
                       var thisFileData = [];
    
                       // Support defining more than one environment type in the same file.
                       // It is recommended to use one file per character though, to stop the
                       // files becoming too large.
                       if (Object.prototype.toString.call(thisItem.attributes) === '[object Array]') {
                          for (var index3 in thisItem.attributes) {
                             thisFileData.push(thisItem.attributes[index3]);
                          }
                       } else {
                          thisFileData.push(thisItem.attributes);
                       }
    
                       if (!(moduleName in pluginData.modules)) {
                           pluginData.modules[moduleName] = {};
                       }
    
                       pluginData.modules[moduleName][filename] = thisFileData;
                    }
                 }
              }
           }
        }
    
        return pluginData;
    },

    // Find the specified filename in the specified module subdirectory.
    // success: return plugin
    // failure: throws
    findPlugin: function(module, filename) {
        var path = require('path');
        var pathroot = path.join(__dirname, "../../QuestOfRealms-plugins/");
        var handlerPath =  pathroot + module + "/" + filename;
        return require(handlerPath);
    }
};