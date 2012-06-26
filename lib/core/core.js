/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('../helpers.js');
  var Process = helpers.core('process');


  // this will spawn a pump process, this way:
  // 1. execute a process (called pump.js)
  // 2. require a monitor module
  // 3. execute another process
  // 4. pump output from process to monitor
  exports.spawnPump = function(options, unattach) {
    var child = new Process({
      file: helpers.executable('pump.js'),
      unattach: unattach,
      options: options
    });

    return child;
  };

  // this will spawn a daemon process, this way:
  // 1. spawn a process (called daemon.js)
  // 2a. daemon.js will start another process (pump.js) using core.spawnPump
  // 2b. daemon.js will store stderr output from pump.js
  // 3a. the pump.js will send PID info to daemon.js
  // 3b. daemon.js will send PID info to pump.js
  // when pump dies:
  // 1. daemon.js will spawn a new pump.js
  // when daemon dies:
  // 1. pump.js will spawn a new daemon.js
  // 2. pump.js will kill itself
  exports.spawnDaemon = function (options, unattach, args) {
    var child = new Process({
      file: helpers.executable('daemon.js'),
      unattach: unattach,
      args: args,
      options: options
    });

    return child;
  };

})();
