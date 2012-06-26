/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var vows = require('vows'),
    assert = require('assert'),

    common = require('../common.js'),
    prope = require(common.watcher('interface.js'));

common.reset();

// vows hack
process.stdout.setMaxListeners(11);

function startImmortal(callback) {
  prope.createInterface(common.fixture('longlive.js'), {
    strategy: 'daemon',
    options: {
      simultaneousError: true
    }
  }, callback);
}

var testsuite = vows.describe('testing simultaneous error');

function addTestSeries() {
  var monitor = null;

  testsuite.addBatch({
    'when starting immortal': {
      topic: function () {
        var self = this;
        startImmortal(function (error, prope) {
          monitor = prope;
          self.callback(error, prope);
        });
      },

      'no errors should occurre in startup': function (error, monitor) {
        assert.ifError(error);
        assert.isNull(monitor.error);
      }
    }

  }).addBatch({
    'when immortal group is ready': {
      topic: function () {
        var self = this;
        monitor.ready();
        monitor.once('process', function () {
          self.callback(null, monitor);
        });
      },

      'an error should occurre in this regression': {
        topic: function (monitor) {
          var self = this;
          var pids = common.copy(monitor.pid);

          monitor.once('reconnect', function () {
            monitor.ready();
            monitor.once('process', function () {

              self.callback(null, monitor, pids);
            });
          });
        },

        'the old immortal group should be dead': function (error, monitor, pids) {
          assert.ifError(error);

          assert.isNumber(pids.daemon);
          assert.isFalse(common.isAlive(pids.daemon));

          assert.isNumber(pids.monitor);
          assert.isFalse(common.isAlive(pids.monitor));

          assert.isNumber(pids.process);
          assert.isFalse(common.isAlive(pids.process));
        },

        'the error should not contain something': function (error, monitor) {
          assert.ifError(error);
          assert.isNull(monitor.error);
        }
      }
    }
  }).addBatch({

    'when immortal stops': {
      topic: function () {
        var self = this;
        var pids = common.copy(monitor.pid);
        monitor.shutdown(function () {
          monitor.close(function () {
            setTimeout(function () {
              self.callback(null, monitor, pids);
            }, 400);
          });
        });
      },

      'the immortal group should be dead': function (error, monitor, pid) {
        assert.ifError(error);

        assert.isNumber(pid.daemon);
        assert.isFalse(common.isAlive(pid.daemon));

        assert.isNumber(pid.monitor);
        assert.isFalse(common.isAlive(pid.monitor));

        assert.isNumber(pid.process);
        assert.isFalse(common.isAlive(pid.process));
      }
    }
  });
}

// Test this 10 times
var i = 10;
while(i--) addTestSeries();

testsuite.exportTo(module);
