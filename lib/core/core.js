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

  // this constrcutor will spawn a new process using a option object
  function Process(options, nested) {
    // save arguments
    this.options = options;
    this.nested = nested;

    // create env object
    var newEnv;
    if (options.nested) {
      newEnv = helpers.mergeObject({
        executionOptions: JSON.stringify(options),
        nestedOptions: nested ? JSON.stringify(nested) : undefined
      }, options.env);
    } else {
      newEnv = options.env;
    }
    this.env = newEnv;

    // defaults
    this.closed = false;
    this.pid = null;

    // streams
    this.stderr = helpers.createStream();
    this.stdout = helpers.createStream();
    this.stdin = helpers.createStream();

    // spawn child
    this.spawn();
    process.nextTick(this.emit.bind(this, 'spawn'));
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

  // Pump output to write streams
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
    this.on('exit', emitter.emit.bind(emitter, 'exit'));
    this.on('spawn', emitter.emit.bind(emitter, 'spawn'));
    this.on('respawn', emitter.emit.bind(emitter, 'respawn'));
  };

  // spawn child
  Process.prototype.spawn = function () {

    // spawn child with given arguments
    var args = [this.options.file].concat(this.options.args || []);
    this.process = child_process.spawn(this.options.exec, args, {
      env: this.env
    });
    this.pid = this.process.pid;

    // relay exit event
    this.process.on('exit', this.emit.bind(this, 'exit'));

    // relay streams
    this.process.stdout.pipe(this.stdout, {end: false});
    this.process.stderr.pipe(this.stderr, {end: false});
    this.stdin.pipe(this.process.stdin, {end: false});

    // close channel if saved options say so
    if (this.closed) {
      this.close();
    }
  };

  // respawn child
  Process.prototype.respawn = function () {
    this.spawn();
    this.emit('respawn');
  };

  // this will spawn a process there will:
  // 1. execute another process
  // 2. pump the output to a monitor object
  exports.spawnPump = function(options) {
    var child = new Process({
      exec: process.execPath,
      file: path.join(helpers.core, 'pump.js'),
      nested: true
    }, options);

    return child;
  };

  // this will spawn a daemon process there will:
  // 1. spawn a pump process
  // 2. handle and store pump output
  // 2a. a part of this output will the the PID of the watched process
  // when the pump process dies:
  // 3. the daemon will kill the watched process
  // 4. the daemon will start a new pump process and send it the unhandled output (error message)
  // when the daemon itself dies:
  // 5. the pump process has continuously watched the daemon and know when it dies
  // 6. pump will kill the watched process
  // 7. pump will start a daemon
  // 8. pump will kill itself
  // 9a. the new daemon will start pump
  // 9b. the pump will start a watched process
  exports.spawnDaemon = function (options) {
    var child = new Process({
      exec: process.execPath,
      file: path.join(helpers.core, 'daemon.js'),
      nested: true
    }, options);

    child.close();
    return child;
  };

  // this will spawn an uattached pump process this way:
  // 1. spawn a process (child)
  // 2. close all std connections
  // 3a. child will spawn a daemon or a pump process depending on the mode
  // 3b. if mode was daemon it will spawn a pump process
  // 3c. the pump process will spawn the desired process
  // 4. the child will kill itself
  exports.spawnProcess = function(options) {
    var child = new Process({
      exec: process.execPath,
      file: path.join(helpers.core, 'execute.js'),
      nested: true
    }, options);

    child.close();
    return child;
  };


})();
