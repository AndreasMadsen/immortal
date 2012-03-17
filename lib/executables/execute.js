/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('../helpers.js');
  var Process = helpers.core('process');

  // get and parse the options
  var child = new Process({
    exec: process.argv[2],
    file: process.argv[3],
    args: process.argv.slice(4),
    env: process.env,
    close: true
  });
  child.spawn();

  // when child is started
  child.on('start', function () {
    // kill the execute.js process
    // the result is that child is deattached from the parent to this process
    process.exit(0);
  });

})();
