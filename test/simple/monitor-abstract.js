/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var vows = require('vows'),
    assert = require('assert'),
    common = require('../common.js'),
    prope = require(common.fixture('interface.js'));

function startImmortal(callback) {
  prope.createInterface(common.fixture('output.js'), {
    strategy: 'development',
    args: ['value1', 'value2'],
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
        exec: process.execPath,
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
      assert.equal(chunk, '-');
    }
  }

}).exportTo(module);
