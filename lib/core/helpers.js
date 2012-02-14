/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var fs = require('fs');
  var util = require('util');
  var path = require('path');
  var events = require('events');
  var Stream = require('stream');

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

  // create a MiddleStream
  function MiddleStream() {
    Stream.apply(this, arguments);
    this.writable = true;
    this.readable = true;

    this.store = [];
    this.paused = false;
  }
  util.inherits(MiddleStream, Stream);
  MiddleStream.prototype.resume = function () {
    while (this.store.length !== 0) {
      this.emit('data', this.store.shift());
    }
    this.paused = false;
  };
  MiddleStream.prototype.pause = function () {
    this.paused = true;
  };

  MiddleStream.prototype.write = function (chunk) {
    if (this.paused) {
      this.store.push(chunk);
      return false;
    }
    this.emit('data', chunk);
    return true;
  };

  MiddleStream.prototype.end = function (chunk) {
    if (chunk !== undefined) this.wirte(chunk);
    // ignore
  };

  MiddleStream.prototype.close = function () {
    // ignore
  };

  exports.createStream = function () {
    return new MiddleStream();
  };

  // get options stored in envorment
  exports.getOptions = function () {
    return JSON.parse(process.env.nestedOptions);
  };

  // create a linestream
  function LineStream(stream) {
    this.buffer = "";
    this.stream = stream;

    var self = this;
    this.stream.on('data', function (chunk) {
      self.buffer += chunk;

      // go through the buffer
      var i, start = 0;
      while ((i = self.buffer.indexOf('\n', start)) >= 0) {
        self.emit('line', JSON.parse(self.buffer.slice(start, i)));
        start = i + 1;
      }
      self.buffer = self.buffer.slice(start);
    });
  }
  util.inherits(LineStream, events.EventEmitter);
  LineStream.prototype.flush = function () {
    this.buffer = "";
  };

  exports.createLineStream = function (stream) {
    return new LineStream(stream);
  };

})();
