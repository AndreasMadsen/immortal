/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var path = require('path');
  var fs = require('fs');
  var exists = fs.existsSync || path.existsSync;

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
  if (!exists(exports.fixture())) {
    fs.mkdirSync(exports.temp, "755");
  }
})();
