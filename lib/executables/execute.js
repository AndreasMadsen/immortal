/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('../helpers.js');
  var path = require('path');
  var core = require(path.join(helpers.core, 'core.js'));

  // get and parse the options
  var options = JSON.parse(process.env.nestedOptions);

  var child;
  if (options.strategy === 'unattached') {
    child = core.spawnPump(options);
  } else if (options.strategy === 'daemon') {
    child = core.spawnDaemon(options);
  }
  child.spawn();

  // when child is started
  child.on('start', function () {

    // close channels
    child.close(function () {

      // kill the execute.js process
      // the result is that child is deattached from the parent to this process
      process.exit(0);
    });
  });

})();
