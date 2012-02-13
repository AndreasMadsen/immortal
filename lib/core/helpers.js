/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var fs = require('fs');
  var path = require('path');

  // exist file
  exports.exists = fs.exists ? fs.exists : path.exists;

  // directorys
  exports.root = path.join(path.dirname(module.filename), '../../');
  exports.lib = path.join(exports.root, 'lib');
  exports.core = path.join(exports.lib, 'core');

  // Extremely simple progress tracker
  function ProgressTracker(callback) {
    this.list = [];
    this.callback = callback;
  }
  ProgressTracker.prototype.add = function(track) {
    this.list.concat(track);
  };
  ProgressTracker.prototype.set = function(what) {
    var index = this.list.indexOf(what);
    if (index === -1) return;
    index.splice(index.indexOf(2), 1);
    this.check();
  };
  ProgressTracker.prototype.check = function() {
    if (this.list.length === 0 && this.callback) {
      this.callback();
    }
  };
  exports.ProgressTracker = ProgressTracker;

  // toArray
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
})();
