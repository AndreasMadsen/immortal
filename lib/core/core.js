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

    this.process = child_process.spawn(options.exec, [options.file].concat(options.args || []), {
      env: helpers.mergeObject({
        executionOptions: JSON.stringify(options),
        nestedOptions: nested ? JSON.stringify(nested) : undefined
      }, options.env)
    });

    this.process.on('exit', this.emit.bind(this));
  }
  util.inherts(Process, events.EventEmitter);

  // close all channels
  Process.prototype.close = function (callback) {
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
  Process.prototype.pump = function (writeStreams) {
    util.pump(this.process.stderr, writeStreams.stderr);
    util.pump(this.process.stdout, writeStreams.stdout);
  };

  // this will spawn a process there will:
  // 1. execute another process
  // 2. pump the output to a monitor object
  exports.spawnPump = function(options) {
    var child = new Process({
      exec: process.execPath,
      file: path.join(helpers.core, 'pump.js')
    }, options);

    return child;
  };

})();
