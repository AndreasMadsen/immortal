/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var path = require('path');
  var fs = require('fs');

  // get test folders
  exports.root = path.join(path.dirname(module.filename), '../');
  exports.test = path.join(exports.root, 'test');
  exports.fixture = path.join(exports.test, 'fixture');
  exports.simple = path.join(exports.test, 'simple');
  exports.temp = path.join(exports.test, 'temp');

  exports.module = path.join(exports.root, 'lib/module.js');

  // create temp file if missing
  var exists = fs.existsSync || path.existsSync;
  if (!exists(exports.temp)) {
    fs.mkdirSync(exports.temp, "755");
  }

})();
