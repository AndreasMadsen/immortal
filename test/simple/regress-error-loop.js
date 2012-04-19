/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var vows = require('vows'),
    assert = require('assert'),
    common = require('../common.js'),
    prope = require(common.fixture('interface.js'));

function startImmortal(callback) {
  prope.createInterface(common.fixture('longlive.js'), {
    strategy: 'daemon',
    options: {
      errorLoop: true
    }
  }, callback);
}

var monitor = null;
vows.describe('testing simultaneous error').addBatch({
  
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
          self.callback(null, monitor, pids);
        });
      },
  
      'the old pump and child process should be dead': function (error, monitor, pids) {
        assert.ifError(error);
        
        assert.equal(monitor.pid.daemon, pids.daemon);
  
        assert.isNumber(pids.monitor);
        assert.isFalse(common.isAlive(pids.monitor));
  
        assert.isNumber(pids.process);
        assert.isFalse(common.isAlive(pids.process));
      },
  
      'the error should not contain something': function (error, monitor) {
        assert.ifError(error);
        
        assert.equal(monitor.error.indexOf('eeeee'), 0);
        assert.equal(monitor.error.length, 1047552);
      }
    }
  }
}).addBatch({
  
  'when immortal stops': {
    topic: function () {
      var self = this;
      var pids = common.copy(monitor.pid);;
      monitor.shutdown(function () {
        monitor.close(function () {
          setTimeout(function () {
            self.callback(null, monitor, pids);
          }, 100);
        });
      });
    },
  
    'the immortal group should be dead': function (error, monitor, pid) {
      assert.ifError(error);
  
      assert.isNumber(pid.daemon);
      assert.isFalse(common.isAlive(pid.daemon));
  
      assert.isNumber(pid.monitor);
      assert.isFalse(common.isAlive(pid.monitor));
  
      assert.isNull(pid.process);
    }
  }
}).exportTo(module);
