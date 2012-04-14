/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var thintalk = require('thintalk');
  var immortal = require('immortal');

  var common = require('../common.js');

  function Monitor() {
    immortal.MonitorAbstract.apply(this, arguments);
    var self = this;

    // Create RPC client
    this.requester = thintalk();
    this.requester.connect('TCP', common.temp('output'));

    // Create RPC server
    this.listener = thintalk({
      getSettings: function () {
        this.callback({
          settings: self.settings,
          strategy: self.strategy,
          options: self.options,
          error: self.error,
          pid: self.pid
        });
      },

      shutdown: function () {
        var client = this;

        self.shutdown(function () {
          self.requester.close();
          client.callback();
          self.listener.close();
        });
      }
    });

    // Start monitor server once connection is made
    this.requester.once('connect', function (remote) {
      self.listener.listen('TCP', common.temp('input'));

      self.listener.once('listening', function () {
        remote.pleaseConnect(function () {
          // Will be executed from testcase when it has connected to the monitor server.
          // After that everything is ready to go :D
          self.ready();
        });
      });
    });

    // Relay std output to testcase
    this.requester.once('connect', function (remote) {

      // Data should not be emitted before monitor.ready is executed
      self.stdout.on('data', remote.data.bind(remote, 'stdout'));
      self.stderr.on('data', remote.data.bind(remote, 'stderr'));
    });

    // Relay monitor events
    this.requester.once('connect', function (remote) {

      // will write the message given in the message object and
      // write the current time and date.
      var handle = function (name) {
        return function (state) {
          remote.emit(name, state, self.pid[name], function () {});
        };
      };

      self.on('daemon', handle('daemon'));
      self.on('monitor', handle('monitor'));
      self.on('process', handle('process'));
    });

  }
  util.inherits(Monitor, immortal.MonitorAbstract);
  exports.Monitor = Monitor;

  // check monitor options
  exports.check = function (options, callback) {
    callback(null);
  };

})();
