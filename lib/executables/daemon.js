/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var path = require('path');

  var helpers = require('./helpers.js');
  var streams = require(path.join(helpers.core, 'streams.js'));
  var core = require(path.join(helpers.core, 'core.js'));

  // get and parse the options
  var options = JSON.stringify(process.env.nestedOptions);

  // spawn a pump process and setup a IPC channel
  var child = new core.spawnPump(options);
  var ipc = new streams.LineStreams(child.stdin, child.stdout);

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
    return function () {
      ipc.write({
        cmd : 'setup',
        emit: emit,
        daemon: process.pid,
        message: errorBuffer
      });
    };
  };

  // handel pump start event
  // there are two possibilities there the monitor could start for
  // first time ever, or the daemon could have restarted.
  // If a process.argv[2] is set then the daemon was restarted.
  var state = process.argv[2] === 'restart' ? 'restart' : 'start';
  child.on('start', setup([
    {emit: 'daemon',  state: state},
    {emit: 'monitor', state: state}
  ]));

  // simply inform the monitor that it did a restart
  child.on('restart', setup([
    {emit: 'monitor', state: 'restart'}
  ]));

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
