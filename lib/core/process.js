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

  // predefine unattach helpers
  var supportUnattach = helpers.version[0] > 1 || helpers.version[1] >= 7;
  var spawnUnattachHelper;

  // this constrcutor will spawn a new process using a option object
  function Process(settings) {
    // save arguments
    this.settings = settings;

    // build args
    this.args = [settings.file].concat(settings.args || []);

    // build exec
    this.exec = settings.exec || process.execPath;

    // build env
    this.env = helpers.mergeObject({}, settings.env || process.env);
    if (settings.options) {
      this.env.spawnOptions = JSON.stringify(settings.options);
    }

    // defaults properties
    this.closed = !!settings.close;
    this.suicide = false;
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
  Process.prototype.pump = function (streams) {
    if (streams.stderr) {
      this.stderr.pipe(streams.stderr, {end: false});
    }

    if (streams.stdout) {
      this.stdout.pipe(streams.stdout, {end: false});
    }

    if (streams.stdin) {
      streams.stdin.pipe(this.stdin, {end: false});
    }
  };

  // spawn a new process
  Process.prototype.spawn = function (respawn) {
    var self = this;

    // use a normal spawn if unattach isn't required or supported by node
    if (!this.settings.unattach || supportUnattach) {
      this.process = child_process.spawn(this.exec, this.args, {
        env: this.env,
        unattach: !!this.settings.unattach
      });
    }

    // else we will need some layer to spawn
    else {
      this.process = spawnUnattachHelper(this);
    }

    // set PID and alive boolean
    this.pid = this.process.pid;
    this.alive = true;

    // handle process exit event
    this.process.on('exit', function () {
      var suicide = this.suicide;
      self.suicide = false;
      self.alive = false;
      self.emit('stop', suicide);
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
      this.suicide = true;
      this.process.kill(signal);
    }
  };

  /**
   * this will spawn an uattached process,
   * the strategy is diffrent depending on the OS and node version
   */
  if (supportUnattach === false) {
    var file;
    // node < 0.7
    // Windows: spawn a process called execute.js there will spawn another process and kill itself
    if (process.platform === 'win32') {
      file = path.join(helpers.execute, 'execute.js');
      spawnUnattachHelper = function(self) {
        return child_process.spawn(process.execPath, [file, self.exec].concat(self.args), {
          env: self.env
        });
      };
    }

    // node < 0.7
    // POSIX: spawn a process called execute, there will spawn another process and run setsid
    else {
      file = path.join(helpers.execute, 'execute');
      spawnUnattachHelper = function(self) {
        return child_process.spawn(file, [self.exec].concat(self.args), {
          env: self.env
        });
      };
    }
  }

})();
