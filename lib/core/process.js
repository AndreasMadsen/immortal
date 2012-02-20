/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var path = require('path');
  var util = require('util');
  var events = require('events');
  var child_process = require('child_process');

  var helpers = require('../helpers.js');
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
    this.alive = false;

    // this streams will relay data from and to the process
    this.stderr = new streams.RelayStream();
    this.stdout = new streams.RelayStream();
    this.stdin = new streams.RelayStream();
  }
  util.inherits(Process, events.EventEmitter);
  module.exports = Process;

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
    var self = this;

    // spawn child with given arguments
    var args = [this.options.file].concat(this.options.args || []);
    var execPath = this.options.exec || process.execPath;
    this.process = child_process.spawn(execPath, args, {
      env: this.env,
      setsid: !!this.options.setsid
    });

    // set PID and alive boolean
    this.pid = this.process.pid;
    this.alive = true;

    // handle process exit event
    this.process.on('exit', function () {
      self.alive = false;
      self.emit('stop');
    });

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

  // kill process if it is alive
  Process.prototype.kill = function (signal) {
    if (this.alive) {
      this.process.kill(signal);
    }
  };

})();
