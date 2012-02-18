/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('./helpers.js');
  var path = require('path');
  var util = require('util');
  var events = require('events');
  var child_process = require('child_process');
  var streams = require(path.join(helpers.core, 'streams.js'));

  // this constrcutor will spawn a new process using a option object
  function Process(options, nested) {
    // save arguments
    this.options = options;
    this.nested = nested;

    // create a copy of the object
    this.env = helpers.mergeObject({}, options.env);
    // if nested information was given save them in "nestedOptions"
    if (nested) {
      this.env.nestedOptions = JSON.stringify(nested);
    }

    // defaults properties
    this.closed = !!options.close;
    this.pid = null;

    // this streams will relay data from and to the process
    this.stderr = new streams.RelayStream();
    this.stdout = new streams.RelayStream();
    this.stdin = new streams.RelayStream();
  }
  util.inherits(Process, events.EventEmitter);
  exports.Process = Process;

  // close all channels
  Process.prototype.close = function (callback) {
    this.closed = true;
    var progress = new helpers.ProgressTracker(callback);

    if (!this.process.stdin.destroyed) {
      progress.add('stdin');
      this.process.stdin.destroy();
      this.process.stdin.on('close', progress.set.bind(progress, 'stdin'));
    }

    if (!this.process.stdout.destroyed) {
      progress.add('stdout');
      this.process.stdout.destroy();
      this.process.stdout.on('close', progress.set.bind(progress, 'stdout'));
    }

    if (!this.process.stderr.destroyed) {
      progress.add('stderr');
      this.process.stderr.destroy();
      this.process.stderr.on('close', progress.set.bind(progress, 'stderr'));
    }
  };

  // pump output to write streams
  Process.prototype.streamPump = function (writeStreams) {
    if (writeStreams.stderr) {
      this.stderr.pipe(writeStreams.stderr, {end: false});
    }

    if (writeStreams.stdout) {
      this.stdout.pipe(writeStreams.stdout, {end: false});
    }

    if (writeStreams.stdin) {
      writeStreams.stdin.pipe(this.stdin, {end: false});
    }
  };

  // pump events to EventEmitter
  Process.prototype.eventPump = function (emitter) {
    this.on('stop', emitter.emit.bind(emitter, 'stop'));
    this.on('start', emitter.emit.bind(emitter, 'start'));
    this.on('restart', emitter.emit.bind(emitter, 'restart'));
  };

  // spawn a new process
  Process.prototype.spawn = function (respawn) {

    // spawn child with given arguments
    var args = [this.options.file].concat(this.options.args || []);
    this.process = child_process.spawn(this.options.exec, args, {
      env: this.env,
      setsid: !!this.options.setsid
    });
    this.pid = this.process.pid;

    // relay events event
    this.process.on('exit', this.emit.bind(this, 'stop'));

    // relay streams
    this.process.stdout.pipe(this.stdout, {end: false});
    this.process.stderr.pipe(this.stderr, {end: false});
    this.stdin.pipe(this.process.stdin, {end: false});

    // emit restart or start event
    // but close streams first if they where closed before
    var eventEmit = this.emit.bind(this, respawn ? 'restart' : 'start');
    if (this.closed) {
      this.close(eventEmit);
    } else {
      process.nextTick(eventEmit);
    }
  };

  // this will spawn a pump process, this way:
  // 1. execute a process (called pump.js)
  // 2. require a monitor module
  // 3. execute another process
  // 4. pump output from process to monitor
  exports.spawnPump = function(options) {
    var child = new Process({
      exec: process.execPath,
      file: path.join(helpers.core, 'pump.js')
    }, options);

    return child;
  };

  // this will spawn an uattached process, this way:
  // 1. spawn a process (called execute.js)
  // 2. close all std connections
  // 3. execute.js will spawn a new process
  // 4. the execute.js process will kill itself
  exports.spawnUnattached = function(options) {
    var child = new Process({
      exec: process.execPath,
      file: path.join(helpers.core, 'execute.js'),
      setsid: true,
      close: true
    }, options);

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
  exports.spawnDaemon = function (options, args) {
    var child = new Process({
      exec: process.execPath,
      args: args,
      file: path.join(helpers.core, 'daemon.js')
    }, options);

    return child;
  };

})();
