/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var fs = require('fs');
  var path = require('path');

  // exists path (path.exists was moved to fs.exists in node 0.7)
  exports.exists = fs.exists || path.exists;

  // common directorys
  exports.root = path.join(path.dirname(module.filename), '../');
  exports.lib = path.join(exports.root, 'lib');
  exports.core = path.join(exports.lib, 'core');
  exports.execute = path.join(exports.lib, 'executables');

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
  exports.processWatcher = function (pid, callback) {
    var checker = setInterval(function () {
      if (exports.alive(pid) === false) {
        clearInterval(checker);
        callback();
      }
    }, 200);
  };

})();
