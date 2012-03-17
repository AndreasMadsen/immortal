/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var path = require('path');
  var events = require('events');

  var helpers = require('../helpers.js');
  var streams = require(path.join(helpers.core, 'streams.js'));

  function MonitorAbstract(error, options, ready) {
    this.error = error;
    this.options = options;
    this.ready = ready;

    this.stdout = new streams.RelayStream();
    this.stderr = new streams.RelayStream();
  }
  util.inherits(MonitorAbstract, events.EventEmitter);
  module.exports = MonitorAbstract;

})();
