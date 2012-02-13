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
    this.streamPump = [];

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
    this.streamPump.push(writeStreams);

    util.pump(this.process.stderr, writeStreams.stderr);
    util.pump(this.process.stdout, writeStreams.stdout);
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

    // relay exit event
    this.process.on('exit', this.emit.bind(this, 'exit'));

    // close channel if saved options say so
    if (this.closed) {
      this.close();
    }

    // since channel will be open we can start stream pumps
    else {
      var pumps = this.streamPump, i = pumps.length;
      this.streamPump = [];
      while (i--) {
        this.pump[ pumps[i] ];
      }
    }
  };

  // respawn child
  Process.prototype.respawn = function () {
    this.spawn();
    this.emit('respawn');
  }

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

})();
