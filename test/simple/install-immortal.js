/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var vows = require('vows'),
    path = require('path'),
    fs = require('fs'),
    assert = require('assert'),
    execFile = require('child_process').execFile,

    common = require('../common.js'),
    helpers = require(path.join(common.root, '/lib/helpers.js'));

var isWin = process.platform === 'win32',
    setup = path.join(common.root, '/src/setup.js'),
    symlink = helpers.executable('execute');

function installImmortal(callback) {
  execFile(process.execPath, [ setup ], function (code, out, err) {
    var output = err === '' ? out : err;

    if (code === 1 || err !== '') {
      return callback(new Error(output || 'got error code 1'), null);
    }

    return callback(null, null);
  });
}

// remove symlink
if (common.existsSync(symlink)) fs.unlinkSync(symlink);

vows.describe('testing npm install').addBatch({

  'when executeing npm install': {
    topic: function () {
      var self = this;
      installImmortal(self.callback);
    },

    'no error should be returned': function (error, dum) {
      assert.ifError(error);
      assert.isNull(dum);
    },

    'the an symlink should exists on posix': isWin ? function () {
      assert.isFalse(common.existsSync(symlink));
    } : function () {
      assert.isTrue(common.existsSync(symlink));
    }
  }

}).addBatch({

  'when executeing npm install again': {
    topic: function () {
      var self = this;
      installImmortal(self.callback);
    },

    'no error should be returned': function (error, dum) {
      assert.ifError(error);
      assert.isNull(dum);
    },

    'the an symlink should exists on posix': isWin ? function () {
      assert.isFalse(common.existsSync(symlink));
    } : function () {
      assert.isTrue(common.existsSync(symlink));
    }
  }

}).exportTo(module);
