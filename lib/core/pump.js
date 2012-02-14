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

  // pause stdin until monitor is ready
  process.stdin.pause();

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

    function sendPidInfo() {
      process.stdout.wirte(JSON.stringify({
        cmd: 'pid',
        pid: child.pid
      }) + "\n");
    }

    // create lineend interface
    var lineStream = helpers.createLineStream(process.stdin);
    lineStream.on('line', function (json) {
      if (json.what === 'setup') {

        // send pid info on setup and respawn
        sendPidInfo();
        child.on('respawn', sendPidInfo);

        // setup monitor
        monitor.setup(json.why, json.message);

        // respawn daemon
        helpers.processWatcher(json.daemon, function () {
          core.spawnProcess(options);
          process.kill(child.pid);
          process.exit(0);
        });
      }
    });

    process.stdin.resume();
  });

})();
