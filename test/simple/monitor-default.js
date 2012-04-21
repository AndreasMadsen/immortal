/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    immortal = require('immortal'),

    common = require('../common.js'),
    propes = require(common.watcher('filewatch.js'));

var outputFile = common.temp('output.txt');
var pidFile = common.temp('daemon.pid');

// Cleanup old files
if (common.existsSync(pidFile)) fs.unlinkSync(pidFile);

// null pid object
var pidInfo = {
  daemon: null,
  monitor: null,
  process: null
};

var outputWatch;
vows.describe('testing default monitor').addBatch({

  'when starting immortal': {
    topic: function () {
      var self = this;

      outputWatch = new propes.LineWatcher(outputFile, function () {
        immortal.start(common.fixture('pingping.js'), {
          strategy: 'daemon',
          options: {
            output: outputFile,
            pidFile: pidFile
          }
        }, function (error) {
          setTimeout(function () {
            self.callback(error, null);
          }, 500);
        });
      });
    },

    'no errors should exist': function (error, dum) {
      assert.ifError(error);
      assert.isNull(dum);
    },

    'a output file should exist': function () {
      assert.ok(common.existsSync(outputFile));
    },

    'a pid file should exist': function () {
      assert.ok(common.existsSync(pidFile));
    },
  }

}).addBatch({

  'the content of the pid file': {
    topic: function () {
      var self = this;
      fs.readFile(pidFile, 'utf8', function (error, content) {
        if (error) return self.callback(error, null, null);

        try {
          pidInfo = JSON.parse(content);
          self.callback(null, content, pidInfo);
        } catch (e) {
          self.callback(e, null, null);
        }
      });
    },

    'should be a JSON object': function (error, content, pidInfo) {
      assert.ifError(error);
      assert.notEqual(content, '');
      assert.deepEqual(Object.keys(pidInfo), ['process', 'monitor', 'daemon']);
    },

    'the daemon property should match an alive process': function (error, content, pidInfo) {
      assert.ifError(error);
      assert.isNumber(pidInfo.daemon);
      assert.isTrue(common.isAlive(pidInfo.daemon));
    },

    'the monitor property should match an alive process': function (error, content, pidInfo) {
      assert.ifError(error);
      assert.isNumber(pidInfo.process);
      assert.isTrue(common.isAlive(pidInfo.process));
    },

    'the process property should match an alive process': function (error, content, pidInfo) {
      assert.ifError(error);
      assert.isNumber(pidInfo.process);
      assert.isTrue(common.isAlive(pidInfo.process));
    }
  }

}).addBatch({

  'the content of the output file': {
    topic: function () {
      var self = this;
      var lines = [], i = 0;

      // grap the first 6 lines
      outputWatch.on('line', function removeMe(line) {
        i += 1;

        // store line
        lines.push(line);

        // stop line reading
        if (i === 6) {
          outputWatch.pause();
          outputWatch.removeListener('line', removeMe);
          self.callback(null, lines);
        }
      });
      outputWatch.resume();
    },

    'should contain time info': function (error, lines) {
      assert.ifError(error);

      // a lazy check
      assert.ok(lines[1].indexOf('=== Time: ') === 0);
      assert.ok(lines[3].indexOf('=== Time: ') === 0);
      assert.ok(lines[5].indexOf('=== Time: ') === 0);
    },

    'should contain pid info': function (error, lines) {
      assert.ifError(error);

      // a lazy check
      assert.ok(lines[0].indexOf('=== monitor#' + pidInfo.monitor) === 0);
      assert.ok(lines[2].indexOf('=== daemon#' + pidInfo.daemon) === 0);
      assert.ok(lines[4].indexOf('=== process#' + pidInfo.process) === 0);
    }
  }

}).addBatch({

  'cleanup: when trying to kill all pids': {
    topic: function () {
      var self = this;

        // Seriouse attempt to kill the immortal group
        // Should you really want that in production, please do it by
        // the session id (posix), the process tree (windows) or use monitor.shoutdown()
        var pidCache = pidInfo;
        var i = 3;
        while(i--) {
          try { process.kill(pidCache.daemon); } catch (e) {}
          try { process.kill(pidCache.monitor); } catch (e) {}
          try { process.kill(pidCache.process); } catch (e) {}
        }

        // Assume that every thing is killed after 500 ms
        setTimeout(function () {
          self.callback(null, pidCache);
        }, 500);
    },

    'all processors should be dead': function (error, pidCache) {
      assert.ifError(error);

      assert.isNumber(pidCache.daemon);
      assert.isFalse(common.isAlive(pidCache.daemon));

      assert.isNumber(pidCache.monitor);
      assert.isFalse(common.isAlive(pidCache.monitor));

      assert.isNumber(pidCache.process);
      assert.isFalse(common.isAlive(pidCache.process));
    },

    teardown : function () {
      outputWatch.close();
    }
  }

}).exportTo(module);
