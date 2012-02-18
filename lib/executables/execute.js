/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('./helpers.js');
  var path = require('path');
  var core = require(path.join(helpers.core, 'core.js'));

  // get and parse the options
  var options = JSON.stringify(process.env.nestedOptions);

  var child;
  if (options.mode === 'unattached') {
    child = core.spawnPump(options);
  } else if (options.mode === 'daemon') {
    child = core.spawnDaemon(options);
  }

  child.close(function () {
    process.exit(0);
  });

})();
