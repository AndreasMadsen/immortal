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

  function MonitorAbstract(error, settings, daemonPid, shutdown, ready) {
    this.error = error;
    this.settings = {
      file: settings.file,
      args: settings.args,
      env: settings.env
    };
    this.strategy = settings.strategy;
    this.options = settings.options;
    this.ready = ready;

    this.stdout = new streams.RelayStream({ paused: true });
    this.stderr = new streams.RelayStream({ paused: true });

    this.pid = {
      process: null,
      monitor: process.pid,
      daemon: daemonPid
    };

    // the shutdown argument contain shutdown methods
    // this function will simply execute them all
    this.shutdown = function (done) {
      var methods = Object.keys(shutdown);

      // keep track of shutdown
      var track = new helpers.ProgressTracker(done);
      track.add(methods);

      // execute all shutdown methods
      methods.forEach(function (type) {
        shutdown[type](track.set.bind(track, type));
      });
    };

  }
  util.inherits(MonitorAbstract, events.EventEmitter);
  module.exports = MonitorAbstract;

})();
