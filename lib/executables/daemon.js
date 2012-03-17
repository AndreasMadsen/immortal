/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('../helpers.js');
  var streams = helpers.core('streams');
  var core = helpers.core('core');

  // get and parse the options
  var options = JSON.parse(process.env.spawnOptions);

  // spawn a pump process and setup a IPC channel
  var child = new core.spawnPump(options, false);
  var ipc = new streams.LineStream(child.stdin, child.stdout);

  // buffer the errors output from the process
  // this will be send to the pump monitor when it restart
  // the reason why the pump restarted should be contained in this string
  var errorBuffer = "";
  child.stderr.on('data', function (chunk) {
    errorBuffer += chunk;
  });

  // when the pump dies we need to kill the watched process
  // the processPID will contain the latest PID
  var processPID = null;
  ipc.on('message', function (msg) {
    if (msg.cmd !== 'pid') return;
    processPID = msg.pid;
  });

  // this function will setup a new pump as a daemon
  var setup = function (emit) {
    ipc.send({
      cmd : 'setup',
      emit: emit,
      daemon: process.pid,
      message: errorBuffer === "" ? null : errorBuffer
    });
  };

  // handel pump start event
  // there are two possibilities there the monitor could start for
  // first time ever, or the daemon could have restarted.
  // If a process.argv[2] is set then the daemon was restarted.
  var state = process.argv[2] === 'restart' ? 'restart' : 'start';
  child.on('start', function () {
    setup([
      {name: 'daemon',  state: state},
      {name: 'monitor', state: state},
      {name: 'process', state: state}
    ]);
  });

  // simply inform the monitor that it did a restart
  child.on('restart', function () {
    setup([
      {name: 'monitor', state: 'restart'},
      {name: 'process', state: 'restart'}
    ]);

    // fluch error buffer, this this was just send to the monitor
    errorBuffer = "";
  });

  // when the pump process die we will spawn a new
  child.on('stop', function () {

    // kill the watched process, since there are no contact
    if (helpers.alive(processPID)) {
      process.kill(processPID);
    }

    // flush IPC stream buffer since new input will overla
    // prevouse JSON string resulting in a JSON parse error
    ipc.flush();

    // spawn new child when the watch process is dead
    helpers.processWatcher(processPID, function () {
      child.spawn(true);
    }, 200);
  });

  // everything is assigned to the Process object, we are ready to spawn
  child.spawn();

})();
