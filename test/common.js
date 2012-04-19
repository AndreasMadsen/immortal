/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var path = require('path');
  var fs = require('fs');

  // fs exists
  exports.existsSync = fs.existsSync || path.existsSync;
  exports.exists = fs.exists || path.exists;

  // get test folders
  exports.root = path.join(path.dirname(module.filename), '../');
  var testDir = path.join(exports.root, 'test');

  // Filepath resolvers
  exports.temp = function (filename) {
    return path.join(testDir, 'temp', filename);
  };
  exports.fixture = function (filename) {
    return path.join(testDir, 'fixture', filename);
  };
  exports.simple = function (filename) {
    return path.join(testDir, 'simple', filename);
  };

  // create temp file if missing
  if (!exports.existsSync(exports.fixture())) {
    fs.mkdirSync(exports.temp, "755");
  }

  // extend options
  exports.extend = function(origin, add) {
    // Don't do anything if add isn't an object
    if (!add) return origin;

    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  };

  // check if pid process alive
  exports.isAlive = function (pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return false;
    }
  };

  // copy object
  exports.copy = function (object) {
    return exports.extend({}, object);
  };

})();
