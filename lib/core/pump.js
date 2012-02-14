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
  var options = helpers.getOptions();

  // get the monitor
  var Monitor = require(options.monitor);

  // create monitor and spawn child
  var monitor = new Monitor(options.options, function () {
    // setup child with automatic respawn
    var child = new core.Process(options);
    child.on('exit', child.respawn.bind(child));

    // pump streams and events
    child.streamPump(monitor);
    child.eventPump(monitor);

    if (options.mode === 'development') {
      child.streamPump(process);
    }
  });

})();
