/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('../helpers.js');
  var core = helpers.core('core');
  var Process = helpers.core('process');
  var streams = helpers.core('streams');
  var createIpc = Process.createIpc;

  // get and parse the options
  var options = JSON.parse(process.env.spawnOptions);

  // get the monitor module given by options.monitor
  var Monitor = require(options.monitor).Monitor;

  // create a new process object
  // the child will first be spawned when child.spawn is executed
  var child = new Process(options);

  // when useing development print output
  if (options.strategy === 'development' && options.relay) {
    child.pump(process);
  }

  // when the deamon restart the process(stop) event should not be emmited
  var daemonInRestart = false;

  // this will shutdown the immortal group
  var shutdown = {
    'daemon': function (callback) {
      callback();
    },
    'child': function (callback) {
      if (child.alive) {
        child.once('stop', callback);
        child.kill();
      } else {
        callback();
      }
    },
    'pump': function (callback) {
      process.stdin.pause();
      callback();
    }
  };

  // first create monitor object, the callback is executed when
  // the monitor constructor call this.ready
  var setupMonitor = function (emits, message, daemonPid) {
    var monitor = new Monitor(message, options, daemonPid, shutdown, child, function () {

      // emit events before starting child
      Object.keys(emits).forEach(function (name) {
        // skip the process event until the child spawns
        if (name === 'process') return;

        monitor.emit.apply(monitor, [name].concat( emits[name] ));
      });

      // spawn child when monitor is ready
      child.spawn();

      // start pumping streams to monitor
      child.pump(monitor);
    });

    // once the child has started emit the process event
    child.once('start', function () {
      monitor.pid.process = child.pid;
      monitor.emit.apply(monitor, ['process'].concat( emits.process ));
    });

    // relay stop and restart to process event on monitor
    child.on('stop', function () {
      monitor.pid.process = null;

      // Do not emit if the deamon is in restart mode
      if (daemonInRestart) return;
      monitor.emit('process', 'stop');
    });
    child.on('restart', function () {
      monitor.pid.process = child.pid;
      monitor.emit('process', 'restart');
    });
  };

  // handle communication between daemon and pump
  if (options.strategy === 'daemon') {

    // setup IPC channel with daemon
    var ipc = createIpc(process);
    ipc.on('message', function (msg) {
      var ignoreDeath = false;

      // watch daemon by its PID
      var watch = new helpers.ProcessWatcher(msg.daemon, process);

      // Do only throw uncaught exception if the parent is alive
      process.on('uncaughtException', function errorHander(error) {
        watch.once('cycle', function () {
          if (watch.dead === false) {
            process.removeListener('uncaughtException', errorHander);
            throw error;
          }

          // if the parent is dead the error will be ignored
          // and a new daemon will be created shorly
        });
      });

      // will be executed when dead
      watch.once('dead', function () {
        if (ignoreDeath) return;

        // kill child process
        daemonInRestart = true;
        child.kill();

        // when the child is dead start a new daemon
        child.once('stop', function () {
          // the restart argument will let the the daemon.js know that it was
          // restarted
          var daemon = core.spawnDaemon(options, false, ['restart']);
          daemon.spawn();

          // the streams will be closed followed by killing the this process
          // this mimics the execute.js procedure but without the extra overhead
          // of createing a new process.
          daemon.close(process.exit.bind(process, 0));
        });
      });

      // replace the fake daemon shutdown method with a real one
      shutdown.daemon = function (callback) {
        ignoreDeath = true;

        // kill the daemon and execute callback when it dies
        watch.once('dead', callback);
        process.kill(msg.daemon);
      };

      // start monitor with a errroMessage if exist
      setupMonitor(msg.emit, msg.message, msg.daemon);
    });

    // when child start or restart send new PID information to daemon
    var informDaemon = function () {
      ipc.send({cmd: 'pid', pid: child.pid});
    };
    child.on('start', informDaemon);
    child.on('restart', informDaemon);

  } else {
    setupMonitor({
      'monitor': ['start'],
      'process': ['start']
    }, null, null);
  }

  // handle child death
  if (options.auto === true) {
    child.on('stop', function (suicide) {
      if (suicide) return;

      // restart child
      child.spawn(true);
    });
  }

})();
