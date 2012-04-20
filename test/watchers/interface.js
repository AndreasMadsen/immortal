/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var path = require('path');
  var events = require('events');
  var thintalk = require('thintalk');
  var immortal = require('immortal');

  var common = require('../common.js');
  var helpers = require(path.join(common.root, 'lib', 'helpers.js'));
  var streams = helpers.core('streams');

  // Pre options set a RPC monitor propert
  var preOptions = {
    'monitor': common.watcher('monitor.js')
  };

  exports.createInterface = function (filename, options, callback) {
    var prope = null;

    // Create listener before starting immortal group
    var listener = thintalk({
      // connect to monitor server
      pleaseConnect: function () {
        var client = this;
        var requester = thintalk();

        requester.connect('TCP', common.temp('input'));

        requester.on('connect', function (remote) {
          var reconnect = (!!prope);

          if (!reconnect) prope = new Interface();

          prope.setup(client.callback, listener, requester, remote, function () {
            if (reconnect) return prope.emit('reconnect');
            callback(null, prope);
          });
        });
      },

      // stderr or stdout data from channel
      data: function (channel, chunk) {
        prope[channel].write(chunk);
        this.callback();
      },

      // monitor event emitted
      emit: function (name, state, pid) {
        prope.pid[name] = pid;
        prope.emit(name, state);
        this.callback();
      }
    });
    listener.listen('TCP', common.temp('output'));

    // When listener is ready start immortal
    listener.once('listening', function () {
      immortal.start(filename, common.extend(preOptions, options), function (error) {
        if (error) return callback(error, null);
      });
    });
  };

  // Montior RPC abstract
  function Interface() {

    // Create relay streams
    this.stdout = new streams.RelayStream({ paused: false });
    this.stderr = new streams.RelayStream({ paused: false });
  }
  util.inherits(Interface, events.EventEmitter);

  // Shutdown immortal group
  Interface.prototype.shutdown = function (callback) {
    this.remote.shutdown(function () {
      callback();
    });
  };

  // Restart immortal group
  Interface.prototype.restart = function () {
    this.remote.restart(function () {});
  };

  // Close RPC connection
  Interface.prototype.close = function (callback) {
    var self = this;
    this.remote.close(function () {
      self.listener.close();
      self.requester.close();
      callback();
    });
  };

  // Will update static properties
  Interface.prototype.setup = function (ready, listener, requester, remote, callback) {
    var self = this;

    this.ready = ready;
    this.remote = remote;
    this.listener = listener;
    this.requester = requester;

    // Set properties
    this.remote.getSettings(function (object) {
      common.extend(self, object);

      // Execute testcase callback
      callback();
    });
  };

})();
