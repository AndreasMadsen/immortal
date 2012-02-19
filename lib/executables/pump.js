/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('./helpers.js');
  var path = require('path');

  var streams = require(path.join(helpers.core, 'streams.js'));
  var core = require(path.join(helpers.core, 'core.js'));

  // get and parse the options
  var options = JSON.stringify(process.env.nestedOptions);

  // get the monitor module given by options.monitor
  var Monitor = require(options.monitor).Monitor;

  // create a new process object
  // the child will first be spawned when child.spawn is executed
  var child = new core.Process(options);

  // first create monitor object, the callback is executed when
  // the monitor constructor call this.ready
  var setupMonitor = function (emits, message) {
    var monitorOptions = options.options;
    var monitor = new Monitor(message, monitorOptions, function () {

      // emit events before starting child
      emits.forEach(function (event) {
        monitor.emit(event.name, event.state);
      });

      // spawn child when monitor is ready
      child.spawn();

      // start pumping streams to monitor
      child.streamPump(monitor);
    });

    // relay stop and restart to process event on monitor
    child.on('stop', monitor.emit.bind(monitor, 'process', 'stop'));
    child.on('restart', monitor.emit.bind(monitor, 'process', 'restart'));
  };

  // handle communication between daemon and pump
  if (options.mode === 'daemon') {

    // setup IPC channel with daemon
    var ipc = new streams.LineStream(process.stdout, process.stdin);
    ipc.on('message', function (msg) {

      // watch daemon by its PID
      // callback will be executed when dead
      helpers.processWatcher(msg.daemon, function () {

        // kill child process
        child.kill();

        // when the child is dead start a new daemon
        helpers.processWatcher(child.pid, function () {
          // the restart argument will let the the daemon.js know that it was
          // restarted
          var daemon = core.spawnDaemon(options, ['restart']);

          // the streams will be closed followed by killing the this process
          // this mimics the execute.js procedure but without the extra overhead
          // of createing a new process.
          daemon.close(process.exit.bind(process, 0));
        });
      });

      // start monitor with a errroMessage if exist
      setupMonitor(msg.emit, msg.message);
    });

    // when child start or restart send new PID information to daemon
    var informDaemon = function () {
      ipc.send({cmd: 'pid', pid: child.pid});
    };
    child.on('start', informDaemon);
    child.on('restart', informDaemon);

  } else {
    setupMonitor([{name: 'monitor', state: 'start'}], null);
  }

  // handle child death
  child.on('stop', function () {

    // restart child
    child.spawn(true);
  });

})();
