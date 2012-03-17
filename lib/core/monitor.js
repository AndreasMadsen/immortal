/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var events = require('events');

  var helpers = require('../helpers.js');
  var streams = helpers.core('streams');

  function MonitorAbstract(error, options, daemonPid, ready) {
    this.error = error;
    this.settings = {
      file: settings.file,
      args: settings.args,
      env: settings.env
    };
    this.strategy = settings.strategy;
    this.options = settings.options;
    this.ready = ready;

    this.stdout = new streams.RelayStream();
    this.stderr = new streams.RelayStream();

    this.pid = {
      process: null,
      monitor: process.pid,
      daemon: daemonPid
    };
  }
  util.inherits(MonitorAbstract, events.EventEmitter);
  module.exports = MonitorAbstract;

})();
