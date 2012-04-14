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
    'monitor': common.fixture('monitor.js')
  };

  exports.createInterface = function (filename, options, callback) {
    var prope = null;

    var requester = thintalk();

    // Create listener before starting immortal group
    var listener = thintalk({
      // connect to monitor server
      pleaseConnect: function () {
        var client = this;
        requester.connect('TCP', common.temp('input'));

        requester.on('connect', function (remote) {
          prope = new Interface(client.callback, listener, requester, remote, callback);
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
  function Interface(ready, listener, requester, remote, callback) {
    var self = this;

    // Set properties
    remote.getSettings(function (object) {
      self.settings = object.settings;
      self.strategy = object.strategy;
      self.options = object.options;
      self.error = object.error;
      self.pid = object.pid;

      // Execute testcase callback
      callback(null, self);
    });

    // Set ready function
    this.ready = ready;

    // Create relay channels
    this.shutdown = function (callback) {
      remote.shutdown(function () {
        listener.close();
        requester.close();
        callback();
      });
    };

    // Create relay streams
    this.stdout = new streams.RelayStream({ paused: true });
    this.stderr = new streams.RelayStream({ paused: true });
  }
  util.inherits(Interface, events.EventEmitter);

})();
