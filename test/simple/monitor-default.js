/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

var fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),

    common = require('../common.js'),
    immortal = require(common.immortal),
    propes = require(common.watcher('filewatch.js'));

var outputFile = common.temp('output.txt');
var pidFile = common.temp('daemon.txt');

// null pid object
var pidInfo = {
  daemon: null,
  monitor: null,
  process: null
};

function pidLog(eq, type, pidList, did) {
  var pre = (eq ? ' ! ' : ' ');

  return ('===' + pre + type + '#' + pidList[type] + ' ' + did + pre + '===');
}

var outputWatch, pidWatch;
vows.describe('testing default monitor').addBatch({

  'when starting immortal': {
    topic: function () {
      var self = this;

      // open file watchers
      outputWatch = new propes.LineWatcher(outputFile, function () {
        pidWatch = new propes.JsonWatcher(pidFile, function () {

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

      pidWatch.once('update', function (object) {
        pidWatch.pause();

        pidInfo = object;
        self.callback(null, object);
      });
      pidWatch.resume();
    },

    'should be a JSON object': function (error, pidInfo) {
      assert.ifError(error);
      assert.deepEqual(Object.keys(pidInfo), ['process', 'monitor', 'daemon']);
    },

    'the daemon property should match an alive process': function (error, pidInfo) {
      assert.ifError(error);
      assert.isNumber(pidInfo.daemon);
      assert.isTrue(common.isAlive(pidInfo.daemon));
    },

    'the monitor property should match an alive process': function (error, pidInfo) {
      assert.ifError(error);
      assert.isNumber(pidInfo.process);
      assert.isTrue(common.isAlive(pidInfo.process));
    },

    'the process property should match an alive process': function (error, pidInfo) {
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
        if (i === 7) {
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
      assert.equal(lines[0], pidLog(false, 'monitor', pidInfo, 'started for first time'));
      assert.equal(lines[2], pidLog(false, 'daemon', pidInfo, 'started for first time'));
      assert.equal(lines[4], pidLog(false, 'process', pidInfo, 'started for first time'));
    },

    'should contain output text': function (error, lines) {
      assert.ifError(error);
      assert.equal(lines[6], '.');
    }
  }

}).addBatch({

  'when the child process restarts': {
    topic: function () {
      process.kill(pidInfo.process);

      var self = this;
      var pidCache = pidInfo;
      pidWatch.on('update', function removeMe(object) {
        if (object.process === null) return;

        // pause pidWatch when the process property is set
        pidWatch.pause();
        pidWatch.removeListener('update', removeMe);

        // save pid info
        pidInfo = object;
        self.callback(null, pidCache, object);
      });
      pidWatch.resume();
    },

    'the pid file should contain new pid info': function (error, pidCache, pidInfo) {
      assert.ifError(error);

      assert.notEqual(pidInfo.process, pidCache.process);
      assert.equal(pidInfo.monitor, pidCache.monitor);
      assert.equal(pidInfo.daemon, pidCache.daemon);

      assert.isNumber(pidInfo.process);
      assert.isTrue(common.isAlive(pidInfo.process));
    },

    'the output file': {
      topic: function () {
        var self = this;
        var lines = [], i = 0;

        // grap the first 6 lines
        outputWatch.on('line', function removeMe(line) {
          // skip the stdeout lines
          if (i === 0 && line === '.') return;

          i += 1;

          // store line
          lines.push(line);

          // stop line reading
          if (i === 5) {
            outputWatch.pause();
            outputWatch.removeListener('line', removeMe);
            self.callback(null, lines);
          }
        });
        outputWatch.resume();
      },

      'should contain pid and time info': function (error, lines) {
        assert.ifError(error);

        assert.equal(lines[0], '=== ! process terminated ! ===');
        assert.ok(lines[1].indexOf('=== Time: ') === 0);
        assert.equal(lines[2], pidLog(true, 'process', pidInfo, 'restarted'));
        assert.ok(lines[3].indexOf('=== Time: ') === 0);
      },

      'should contain output text': function (error, lines) {
        assert.ifError(error);
        assert.equal(lines[4], '.');
      }
    }
  }

}).addBatch({

  'when the monitor process restarts': {
    topic: function () {
      process.kill(pidInfo.monitor);

      var self = this;
      var pidCache = pidInfo;
      pidWatch.on('update', function removeMe(object) {
        if (object.process === null) return;

        // pause pidWatch when the process property is set
        pidWatch.pause();
        pidWatch.removeListener('update', removeMe);

        // save pid info
        pidInfo = object;
        self.callback(null, pidCache, object);
      });
      pidWatch.resume();
    },

    'the pid file should contain new pid info': function (error, pidCache, pidInfo) {
      assert.ifError(error);

      assert.notEqual(pidInfo.process, pidCache.process);
      assert.notEqual(pidInfo.monitor, pidCache.monitor);
      assert.equal(pidInfo.daemon, pidCache.daemon);

      assert.isNumber(pidInfo.monitor);
      assert.isTrue(common.isAlive(pidInfo.monitor));

      assert.isNumber(pidInfo.process);
      assert.isTrue(common.isAlive(pidInfo.process));
    },

    'the output file': {
      topic: function () {
        var self = this;
        var lines = [], i = 0;

        // grap the first 6 lines
        outputWatch.on('line', function removeMe(line) {
          // skip the stdeout lines
          if (i === 0 && line === '.') return;

          i += 1;

          // store line
          lines.push(line);

          // stop line reading
          if (i === 5) {
            outputWatch.pause();
            outputWatch.removeListener('line', removeMe);
            self.callback(null, lines);
          }
        });
        outputWatch.resume();
      },

      'should contain pid and time info': function (error, lines) {
        assert.ifError(error);

        assert.equal(lines[0], pidLog(true, 'monitor', pidInfo, 'restarted'));
        assert.ok(lines[1].indexOf('=== Time: ') === 0);
        assert.equal(lines[2], pidLog(true, 'process', pidInfo, 'restarted'));
        assert.ok(lines[3].indexOf('=== Time: ') === 0);
      },

      'should contain output text': function (error, lines) {
        assert.ifError(error);
        assert.equal(lines[4], '.');
      }
    }
  }

}).addBatch({

  'when the daemon process restarts': {
    topic: function () {
      process.kill(pidInfo.daemon);

      var self = this;
      var pidCache = pidInfo;
      pidWatch.on('update', function removeMe(object) {
        if (object.process === null) return;

        // pause pidWatch when the process property is set
        pidWatch.pause();
        pidWatch.removeListener('update', removeMe);

        // save pid info
        pidInfo = object;
        self.callback(null, pidCache, object);
      });
      pidWatch.resume();
    },

    'the pid file should contain new pid info': function (error, pidCache, pidInfo) {
      assert.ifError(error);

      assert.notEqual(pidInfo.process, pidCache.process);
      assert.notEqual(pidInfo.monitor, pidCache.monitor);
      assert.notEqual(pidInfo.daemon, pidCache.daemon);

      assert.isNumber(pidInfo.daemon);
      assert.isTrue(common.isAlive(pidInfo.daemon));

      assert.isNumber(pidInfo.monitor);
      assert.isTrue(common.isAlive(pidInfo.monitor));

      assert.isNumber(pidInfo.process);
      assert.isTrue(common.isAlive(pidInfo.process));
    },

    'the output file': {
      topic: function () {
        var self = this;
        var lines = [], i = 0;

        // grap the first 6 lines
        outputWatch.on('line', function removeMe(line) {
          // skip the stdeout lines
          if (i === 0 && line === '.') return;

          i += 1;

          // store line
          lines.push(line);

          // stop line reading
          if (i === 7) {
            outputWatch.pause();
            outputWatch.removeListener('line', removeMe);
            self.callback(null, lines);
          }
        });
        outputWatch.resume();
      },

      'should contain pid and time info': function (error, lines) {
        assert.ifError(error);

        assert.equal(lines[0], pidLog(true, 'monitor', pidInfo, 'restarted'));
        assert.ok(lines[1].indexOf('=== Time: ') === 0);
        assert.equal(lines[2], pidLog(true, 'daemon', pidInfo, 'restarted'));
        assert.ok(lines[3].indexOf('=== Time: ') === 0);
        assert.equal(lines[4], pidLog(true, 'process', pidInfo, 'restarted'));
        assert.ok(lines[5].indexOf('=== Time: ') === 0);
      },

      'should contain output text': function (error, lines) {
        assert.ifError(error);
        assert.equal(lines[6], '.');
      }
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
      pidWatch.close();
    }
  }

}).exportTo(module);
