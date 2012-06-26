/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var vows = require('vows'),
    assert = require('assert'),
    common = require('../common.js'),
    prope = require(common.watcher('interface.js'));

common.reset();

function startImmortal(callback) {
  prope.createInterface(common.fixture('output.js'), {
    strategy: 'development',
    args: ['value1', 'value2'],
    relay: false,
    options: {
      foo: 'bar'
    }
  }, callback);
}

var monitor = null;
vows.describe('testing monitor abstact').addBatch({

  'the initalization property': {
    topic: function () {
      var self = this;
      startImmortal(function (error, prope) {
        monitor = prope;
        self.callback(error, prope);
      });
    },

    'strategy should be development': function (error, monitor) {
      assert.ifError(error);
      assert.equal(monitor.strategy, 'development');
    },

    'the settings object should contain startup settings': function (error, monitor) {
      assert.ifError(error);
      assert.deepEqual(monitor.settings, {
        file: common.fixture('output.js'),
        args: ['value1', 'value2'],
        env: process.env
      });
    },

    'the options object should match the given options': function (error, monitor) {
      assert.ifError(error);
      assert.deepEqual(monitor.options, {
        foo: 'bar'
      });
    },

    'pid should match alive processors': function (error, monitor) {
      assert.ifError(error);

      // Since we run in development mode
      assert.isNull(monitor.pid.daemon);

      // Since montor.ready hasn't been executed
      assert.isNull(monitor.pid.process);

      // The pump process should however be alive
      assert.isNumber(monitor.pid.monitor);
      assert.isTrue(common.isAlive(monitor.pid.monitor));
    }
  }

}).addBatch({

  'when the process is started': {
    topic: function () {
      monitor.ready();
      this.callback(null, monitor);
    },

    'and process event has emitted': {
      topic: function (monitor) {
        var self = this;
        monitor.once('process', function (state) {
          self.callback(null, monitor, state);
        });
      },

      'the pid informations should be updated': function (error, monitor) {
        assert.ifError(error);

        // since we run in development mode
        assert.isNull(monitor.pid.daemon);

        // Both process and pump process should be alive
        assert.isNumber(monitor.pid.process);
        assert.isTrue(common.isAlive(monitor.pid.process));

        assert.isNumber(monitor.pid.monitor);
        assert.isTrue(common.isAlive(monitor.pid.monitor));
      },

      'the state argument should be start': function (error, monitor, state) {
        assert.ifError(error);
        assert.equal(state, 'start');
      }
    }
  }

}).addBatch({

  'when stdout data is emitted': {
    topic: function () {
      var self = this;
      monitor.stdout.once('data', function (chunk) {
        self.callback(null, monitor, chunk);
      });
    },

    'the propper chunk should be rescived': function (error, monitor, chunk) {
      assert.ifError(error);
      assert.equal(chunk, '.');
    }
  },

  'when stderr data is emitted': {
    topic: function () {
      var self = this;
      monitor.stderr.once('data', function (chunk) {
        self.callback(null, monitor, chunk);
      });
    },

    'the propper chunk should be rescived': function (error, monitor, chunk) {
      assert.ifError(error);
      assert.equal(chunk, '-');
    }
  }

}).addBatch({

  'when shutting down the immortal group': {
    topic: function () {
      var self = this;
      var processPid = monitor.pid.process;

      monitor.shutdown(function () {
        self.callback(null, monitor, processPid);
      });
    },

    'process event should emit': {
      topic: function (monitor, processPid) {
        var self = this;

        monitor.once('process', function (state) {
          self.callback(null, monitor, state, processPid);
        });
      },

      'state should be stop': function (error, monitor, state) {
        assert.ifError(error);
        assert.equal(state, 'stop');
      },

      'process should not be alive': function (error, monitor, state, pid) {
        assert.ifError(error);
        assert.isNumber(pid);
        assert.isFalse(common.isAlive(pid));
      },

      'pid should be null': function (error, monitor) {
        assert.ifError(error);
        assert.isNull(monitor.pid.process);
      }
    }
  }

}).addBatch({

  'when closeing RPC connection': {
    topic: function () {
      var self = this;
      var pid = monitor.pid.monitor;
      monitor.close(function () {
        setTimeout(function () {
          self.callback(null, monitor, pid);
        }, 500);
      });
    },

    'the pump process should die after about 500 ms': function (error, monitor, pid) {
      assert.ifError(error);
      assert.isNumber(pid);
      assert.isFalse(common.isAlive(pid));
    }
  }

}).exportTo(module);
