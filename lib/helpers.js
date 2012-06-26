/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var fs = require('fs');
  var path = require('path');
  var util = require('util');
  var events = require('events');

  // exists path (path.exists was moved to fs.exists in node 0.7)
  exports.exists = fs.exists || path.exists;

  // common directorys
  exports.root = path.join(path.dirname(module.filename), '../');
  exports.lib = path.join(exports.root, 'lib');

  // get a core module
  exports.core = function (name) {
    return require(path.join(exports.lib, 'core', name + '.js'));
  };

  // get a executable path
  exports.executable = function (name) {
    return path.join(exports.lib, 'executables', name);
  };

  // parse the node version
  var version = exports.version = process.version.split(/[^0-9]+/)
    .filter(function (val) { return (val !== ''); })
    .map(function (val) { return parseInt(val, 10); });

  // support detection using version
  exports.support = {
    detached: version[0] >= 1 || version[1] >= 8,
    disconnect: version[0] >= 1 || version[1] >= 8,
    close: version[0] >= 1 || version[1] >= 8,
    pipeFork: version[0] >= 1 || version[1] >= 8
  };

  // Simple progress tracker, will execute callback when .list is empty
  function ProgressTracker(callback) {
    this.list = [];
    this.callback = callback;
  }
  ProgressTracker.prototype.add = function(track) {
    this.list = this.list.concat(track);
  };
  ProgressTracker.prototype.set = function(what) {
    var index = this.list.indexOf(what);
    if (index === -1) return;
    this.list.splice(index, 1);
    this.check();
  };
  ProgressTracker.prototype.check = function() {
    if (this.list.length === 0 && this.callback) {
      this.callback();
    }
  };
  exports.ProgressTracker = ProgressTracker;

  // convert arguments to an array
  exports.toArray = function (args) {
    return Array.prototype.slice.call(args);
  };

  // merge/copy objects
  exports.mergeObject = function (to, from) {
    for (var key in from) {
      to[key] = from[key];
    }
    return to;
  };

  // check if process is alive
  exports.alive = function(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return false;
    }
  };

  // continusely check if process alive
  // and execute callback when the process is missing
  function processWatcher(pid) {
    var self = this;

    this.dead = false;

    if (exports.alive(pid) === false) {
      process.nextTick(function () {
        self.dead = true;
        self.emit('dead');
      });
      return self;
    }

    this.interval = setInterval(function () {
      if (exports.alive(pid) === false) {
        self.dead = true;
        self.stop();
        self.emit('dead');
      }
      self.emit('cycle');
    });
  }
  util.inherits(processWatcher, events.EventEmitter);
  exports.processWatcher = processWatcher;

  processWatcher.prototype.stop = function () {
    clearInterval(this.interval);
  };

})();
