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
    immortal = require(common.immortal),
    helpers = require(path.join(common.root, '/lib/helpers.js'));

common.reset();

var isWin = process.platform === 'win32',
    outputFile = common.temp('output.txt'),
    pidFile = common.temp('daemon.txt'),
    setup = path.join(common.root, '/src/setup.js'),
    symlink = helpers.executable('execute');

var useSuplement = isWin === false && helpers.support.detached === false;

function installImmortal(callback) {
  execFile(process.execPath, [ setup ], function (error, stdout, stderr) {
    var output = stderr === '' ? stdout : stderr;
    var code = error ? error.code : 0;

    if (code === 1 || stderr !== '') {
      return callback(new Error(output || 'got error code 1'), null);
    }

    return callback(null, null);
  });
}

// remove symlink
if (common.existsSync(symlink)) fs.unlinkSync(symlink);

var test = vows.describe('testing npm install');

if (useSuplement) {
  test.addBatch({
    'when executeing immortal without a symlink': {
      topic: function () {
        var self = this;

        immortal.start(common.fixture('pingping.js'), {
          strategy: 'development',
          options: {
            output: outputFile,
            pidFile: pidFile
          }
        }, function (error) {
          self.callback(error, null);
        });
      },

      'an error should be returned': function (error, num) {
        assert.equal(error.message, 'npm install was not executed');
      }
    }
  });
}

test.addBatch({

  'when executeing npm install': {
    topic: function () {
      var self = this;
      installImmortal(self.callback);
    },

    'no error should be returned': function (error, dum) {
      assert.ifError(error);
      assert.isNull(dum);
    },

    'the an symlink should exists on posix': useSuplement ? function () {
      assert.isTrue(common.existsSync(symlink));
    } : function () {
      assert.isFalse(common.existsSync(symlink));
    }
  }

});

test.addBatch({

  'when executeing npm install again': {
    topic: function () {
      var self = this;
      installImmortal(self.callback);
    },

    'no error should be returned': function (error, dum) {
      assert.ifError(error);
      assert.isNull(dum);
    },

    'the an symlink should exists on posix': useSuplement ? function () {
      assert.isTrue(common.existsSync(symlink));
    } : function () {
      assert.isFalse(common.existsSync(symlink));
    }
  }

});

test.exportTo(module);
