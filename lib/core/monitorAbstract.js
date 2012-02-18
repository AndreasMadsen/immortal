/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var events = require('events');

  var helpers = require('./helpers.js');

  function MonitorAbstract(options, ready) {
    this.options = options;
    this.ready = ready;

    this.stdout = helpers.createStream();
    this.stderr = helpers.createStream();
  }
  util.inherits(MonitorAbstract, events.EventEmitter);
  module.exports = MonitorAbstract;

})();
