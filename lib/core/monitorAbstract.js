/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var events = require('events');
  var Stream = require('stream');

  function createStream() {
    var stream = new Stream();
    stream.writable = stream.readable = true;
    return stream;
  }

  function MonitorAbstract(options, ready) {
    this.options = options;
    this.ready = ready;

    this.stdout = createStream();
    this.stderr = createStream();
  }
  util.inherits(MonitorAbstract, events.EventEmitter);
  module.exports = MonitorAbstract;

})();
