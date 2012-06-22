/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var events = require('events');
  var child_process = require('child_process');

  var helpers = require('../helpers.js');
  var streams = helpers.core('streams');

  // predefine unattach helpers
  var supportUnattach = false; //helpers.version[0] > 1 || helpers.version[1] >= 7;
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
    this.stderr = new streams.RelayStream({ paused: false });
    this.stdout = new streams.RelayStream({ paused: false });
    this.stdin = new streams.RelayStream({ paused: false });
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
    if (!this.settings.deatached || supportUnattach) {
      this.process = child_process.spawn(this.exec, this.args, {
        env: this.env,
        unattach: !!this.settings.deatached
      });
    }

    // else we will need some layer to spawn
    else {
      this.process = spawnUnattachHelper(this);
    }

    // set PID and alive boolean
    this.pid = this.process.pid;
    this.alive = true;

    var forceClose = function (child, channel) {
      var stdout = setTimeout(function () {
        child[channel].destroy();
      }, 200);
      child[channel].once('close', function () {
        clearTimeout(stdout);
      });
    };

    // when the process dies (before the channels is closed)
    if (helpers.version[1] >= 8) {
      this.process.once('exit', function () {

        // force destroy channels after 200 ms, if they didn't close them self
        forceClose(self.process, 'stdin');
        forceClose(self.process, 'stdout');
        forceClose(self.process, 'stderr');
      });
    } else {
      var internalHandle = this.process._internal.onexit;
      this.process._internal.onexit = function () {

        // force destroy channels after 200 ms, if they didn't close them self
        forceClose(self.process, 'stdin');
        forceClose(self.process, 'stdout');
        forceClose(self.process, 'stderr');

        return internalHandle.apply(self.process._internal, arguments);
      };
    }

    // handle process stdio close event
    var eventName = helpers.version[1] >= 8 ? 'close' : 'exit';
    this.process.once(eventName, function () {
      var suicide = self.suicide;
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
    // Windows: spawn a process called execute.js there will spawn another process and kill itself
    if (process.platform === 'win32') {
      file = helpers.executable('execute.js');

      spawnUnattachHelper = function(self) {
      var child = child_process.spawn(process.execPath, [file, self.exec].concat(self.args), {
          env: self.env
        });

        child.stderr.destroy();
        child.stdin.destroy();
        child.stdout.destroy();
        return child;
      };
    }

    // POSIX: spawn a process called execute, there will spawn another process and run setsid
    else {
      file = helpers.executable('execute');

      spawnUnattachHelper = function(self) {
        var child = child_process.spawn(file, [self.exec].concat(self.args), {
          env: self.env
        });

        child.stderr.destroy();
        child.stdin.destroy();
        child.stdout.destroy();
        return child;
      };
    }
  }

})();
