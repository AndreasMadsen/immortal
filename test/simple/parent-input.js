/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var vows = require('vows'),
    assert = require('assert'),

    common = require('../common'),
    immortal = require(common.immortal);

common.reset();

vows.describe('immortal input check').addBatch({

  'when callback is missing': {
    topic: function () {
      immortal.start(common.fixture('longlive.js'));
    },
    'it should throw because of missing callback': function (respons, err) {
      assert.equal(err.message, 'callback is missing');
      assert.isNull(respons);
    }
  },

  'when executeing immortal with no options': {
    topic: function () {
      immortal.start(common.fixture('longlive.js'), this.callback);
    },
    'it should fail because of default monitor': function (respons, err) {
      assert.ifError(err);
      assert.equal(respons.message, 'monitor option .output must be a string');
    }
  },

  'when daemon file do not exists': {
    topic: function () {
      immortal.start(common.fixture('missing.js'), {
        strategy: 'development',
        options: {
          output: common.temp('should_not_exists'),
          pidFile: common.temp('should_not_exists')
        }
      },this.callback);
    },
    'it should fail because of missing file': function (respons, err) {
      assert.ifError(err);
      assert.equal(respons.message, 'file was not found (' + common.fixture('missing.js') + ')');
    }
  },

  'when the option': {
    'args is not an array': {
      topic: function () {
        immortal.start(common.fixture('missing.js'), {
          strategy: 'development',
          args: false
        }, this.callback);
      },
      'it will fail': function (respons, err) {
        assert.ifError(err);
        assert.equal(respons.message, 'options.args must be an array');
      }
    },

    'env is not a string': {
      topic: function () {
        immortal.start(common.fixture('missing.js'), {
          strategy: 'development',
          env: null
        }, this.callback);
      },
      'it will fail': function (respons, err) {
        assert.ifError(err);
        assert.equal(respons.message, 'options.env must be an object');
      }
    },

    'strategy is not supported': {
      topic: function () {
        immortal.start(common.fixture('missing.js'), {
          strategy: 'wrong'
        }, this.callback);
      },
      'it will fail': function (respons, err) {
        assert.ifError(err);
        assert.equal(respons.message, 'options.strategy is not supported');
      }
    },

    'monitor is not supported': {
      topic: function () {
        immortal.start(common.fixture('missing.js'), {
          monitor: false
        }, this.callback);
      },
      'it will fail': function (respons, err) {
        assert.ifError(err);
        assert.equal(respons.message, 'options.monitor must be a string');
      }
    }

  }

}).exportTo(module);
