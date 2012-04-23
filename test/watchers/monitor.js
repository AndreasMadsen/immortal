/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var thintalk = require('thintalk');

  var common = require('../common.js');
  var immortal = require(common.immortal);

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
        self.restart();
        this.callback();
      },

      shutdown: function () {
        stopErrorLoop = true;
        clearTimeout(simultaneousError);
        self.shutdown(this.callback);
      },

      close: function () {
        this.callback();
        self.requester.close();
        self.listener.close();
      }
    });

    // Regression: Will output stderr until something happens
    var stopErrorLoop = false;
    function setOutputErrors() {
      var KB = (new Array(1025)).join('e');

      process.nextTick(function loop() {
        if (stopErrorLoop) return;

        process.stderr.write(KB);
        process.nextTick(loop);
      });
    }

    // Regression: Will output stderr until something happens
    var simultaneousError;
    function setSimultaneousError() {
      simultaneousError = setTimeout(function () {

        process.kill(self.pid.daemon);
        setTimeout(function () {
          throw new Error('lucky number error');
        }, 6); // <- this is my lucky number (or so I hope)
      }, 100);
    }

    // Start monitor server once connection is made
    this.requester.once('connect', function (remote) {
      self.listener.listen('TCP', common.temp('input'));

      self.listener.once('listening', function () {
        remote.pleaseConnect(function () {
          // Will be executed from testcase when it has connected to the monitor server.
          // After that everything is ready to go :D
          self.ready();

          if (self.options.errorLoop) {
            setOutputErrors();
          } else if (self.options.simultaneousError) {
            setSimultaneousError();
          }

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
