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

  // this constrcutor will spawn a new process using a option object
  function Process(settings) {
    // save arguments
    this.settings = settings;

    // build args
    this.args = [settings.file].concat(settings.args || []);

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

    // relay io
    if (this.settings.ipc && helpers.support.pipeFork) {
      this.send = function () {
        this.process.send.apply(this.process, arguments);
      };
      this.flush = function () {};
    }
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

    // in some node versions and extra layer is need
    if (this.settings.detached) {
      this.process = spawnUnattachHelper(this);
    }

    // if an IPC channel is required and fork can be used, spawn with fork
    else if (this.settings.ipc && helpers.support.pipeFork) {
      var filename = this.args.slice(0, 1);
      this.process = child_process.fork(filename, this.args.slice(1), {
        env: this.env,
        silent: true
      });
    }

    // use std spawn method
    else {
      this.process = child_process.spawn(process.execPath, this.args, {
        env: this.env,
        stdio: 'pipe'
      });
    }

    // relay io
    if (this.settings.ipc && helpers.support.pipeFork) {
      this.process.on('message', this.emit.bind(this, 'message'));
    }

    // set PID and alive boolean
    this.pid = this.process.pid;
    this.alive = true;

    interceptDeath(this.process, {
      // when the process dies (before the channels is closed)
      'exit': function () {
        // force destroy channels after 200 ms, if they didn't close them self
        closeProcess(self.process);
      },

      // handle process stdio close event
      'close': function () {
        var suicide = self.suicide;
        self.suicide = false;
        self.alive = false;
        self.emit('stop', suicide);
      }
    });

    // relay streams
    if (this.process.stdout) this.process.stdout.pipe(this.stdout, {end: false});
    if (this.process.stderr) this.process.stderr.pipe(this.stderr, {end: false});
    if (this.process.stdin) this.stdin.pipe(this.process.stdin, {end: false});

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

  // close all streams
  function forceClose(channel) {
    if (!channel) return;

    var destroyer = setTimeout(function () {
      channel.destroy();
    }, 200);

    channel.once('close', function () {
      clearTimeout(destroyer);
    });
  }
  function closeProcess(child) {
    var io = child.stdio || [child.stdin, child.stdout, child.stderr];
    var i = io.length;

    while (i--) forceClose(io[i]);
  }


  /**
   * Use native fork IPC API, or intercept stdio and create one
   */
  Process.createIpc = function (child) {
    if (child.send) {
      return child;
    }

    // create an JSON-newline based IPC channel
    if (child === process) {
      return new streams.LineStream(child.stdout, child.stdin);
    }

    return new streams.LineStream(child.stdin, child.stdout);
  };

  /**
   * An helper function there will intercept internal exit event if necessary
   */
  function interceptDeath(process, events) {
    var closeEvent = helpers.support.close;

    // all channels are closed
    process.once(closeEvent ? 'close' : 'exit', events.close);

    // the process died
    if (closeEvent) {
      process.once('exit', events.exit);
    } else {

      // intercept internal onexit call
      var internalHandle = process._internal.onexit;
      process._internal.onexit = function () {
        events.exit();
        internalHandle.apply(this, arguments);
      };
    }
  }

  /**
   * this will spawn an uattached process,
   * the strategy is diffrent depending on the OS and node version
   */
  var file, spawnUnattachHelper;
  var exec = process.execPath;
  if (helpers.support.detached) {

    spawnUnattachHelper = function (self) {
      var child = child_process.spawn(process.execPath, self.args, {
        env: self.env,
        detached: true,
        stdio: 'ignore'
      });

      child.unref();
      return child;
    };
  }

  // Windows: spawn a process called execute.js there will spawn another process and kill itself
  else if (process.platform === 'win32') {
    file = helpers.executable('execute.js');

    spawnUnattachHelper = function(self) {
      var child = child_process.spawn(process.execPath, [file, exec].concat(self.args), {
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
      var child = child_process.spawn(file, [exec].concat(self.args), {
        env: self.env
      });

      child.stderr.destroy();
      child.stdin.destroy();
      child.stdout.destroy();
      return child;
    };
  }

})();
