/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),

    common = require('../common.js'),
    immortal = require(common.immortal),
    child_process = require('child_process');

var outputFile = common.temp('output.txt');
var pidFile = common.temp('daemon.txt');

if (common.existsSync(outputFile)) fs.unlinkSync(outputFile);
if (common.existsSync(pidFile)) fs.unlinkSync(pidFile);

// used to catch stderr from immortal
var sandbox = null;

vows.describe('testing default monitor with no output or pidFile').addBatch({

  'when starting immortal': {
    topic: function () {
      var self = this;
      
      sandbox = child_process.spawn(process.execPath, [ common.fixture('sandbox.js') ]);
      
      var out = function (chunk) {
        self.callback(null, chunk);
        sandbox.stderr.removeListener('data', err);
      };
      
      var err = function (chunk) {
        self.callback(chunk, null);
        sandbox.stdout.removeListener('data', out);
      };
      sandbox.stdout.once('data', out);
      sandbox.stderr.once('data', err);
    },

    'no errors should exist': function (error, chunk) {
      assert.ifError(error);
      assert.equal(chunk.toString().indexOf('.'), 0);
    },

    'a output file should not exist': function () {
      assert.isFalse(common.existsSync(outputFile));
    },

    'a pid file should not exist': function () {
      assert.isFalse(common.existsSync(pidFile));
    },
  }

}).addBatch({

  'cleanup: when trying to kill all pids': {
    topic: function () {
      var self = this;
      
      // in theory a SIGPIPE should be propergated though the immortal group
      // once the parent dies
      sandbox.kill();
      
      sandbox.once('exit', this.callback.bind(this, null, sandbox.pid));
    },

    'the parent should be dead': function (error, pid) {
      assert.isFalse(common.isAlive(pid));
    }
  }

}).exportTo(module);
