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

  // setup child with automatic respawn
  var child = new core.spawnPump(options);

  // setup pump as daemon
  helpers.sendLineMessage(child.stdin, {
    cmd : 'setup',
    why: process.argv[2] || 'pump start',
    daemon: process.pid,
    message: ""
  });

  // buffer errors
  var errorBuffer = "";
  child.stderr.on('data', function (chunk) {
    errorBuffer += chunk;
  });

  // hande stdout using a lineend protocol
  var watchPid = null;
  var lineStream = helpers.createLineStream(child.stdout);
  lineStream.on('line', function (json) {
    if (json.cmd === 'pid') {
      watchPid = json.pid;
    }
  });

  // handle pump death
  child.on('exit', function () {
    // kill the watched process too
    try {
      process.kill(watchPid);
    } catch (e) {}

    // respaawn pump
    child.respawn();
    helpers.sendLineMessage(child.stdin, {
      cmd : 'setup',
      why: 'pump restart',
      daemon: process.pid,
      message: errorBuffer
    });
  });

})();
