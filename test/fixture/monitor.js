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

      restart: function () {
        var client = this;
        self.on('process', function event(state) {
          if (state !== 'restart') return;
          self.removeListener('process', event);

          process.nextTick(function () {
            client.callback();
          });
        });

        self.restart();
      },

      shutdown: function () {
        self.shutdown(this.callback);
      },

      close: function () {
        this.callback();
        self.requester.close();
        self.listener.close();
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

          // Resume data pipes
          self.stdout.resume();
          self.stderr.resume();
        });
      });
    });

    // Relay std output to testcase
    this.requester.once('connect', function (remote) {

      // Data should not be emitted before monitor.ready is executed
      self.stdout.on('data', function (chunk) {
        remote.data('stdout', chunk.toString(), function () { });
      });

      self.stderr.on('data', function (chunk) {
        remote.data('stderr', chunk.toString(), function () { });
      });
    });

    // Relay monitor events
    this.requester.once('connect', function (remote) {

      // will write the message given in the message object and
      // write the current time and date.
      var handle = function (name) {
        return function (state) {
          var pid = self.pid[name];
          process.nextTick(function () {
            remote.emit(name, state, pid, function () {});
          });
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
