/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('./helpers.js');
  var path = require('path');
  var core = require(path.join(helpers.core, 'helpers.js'));

  // get and parse the options
  var options = process.env.nestedOptions;

  // get the monitor
  var Monitor = require(options.monitor);

  // create monitor and spawn child
  var monitor = new Monitor(options.options, function () {
    // setup child with automatic respawn
    var child = core.Process(options);
    child.on('exit', child.respawn);

    // pump streams and events
    monitor.streamPump();
    monitor.eventPump();
  });

})();
