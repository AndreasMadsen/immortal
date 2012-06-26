/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var fs = require('fs');
  var path = require('path');
  var equilibrium = require('equilibrium');

  var immortal = require('./module.js');
  var helpers = require('./helpers.js');
  var streams = helpers.core('streams');

  function Monitor() {
    immortal.MonitorAbstract.apply(this, arguments);
    var self = this;

    var track = new helpers.ProgressTracker(this.ready.bind(this));
    track.add(['output', 'pidFile']);

    // create a write stream, the file path was checked by exports.check
    if (this.options.output === null) {
      track.set('output');
    } else {
      this.stream = fs.createWriteStream(this.options.output, {
        flags: 'a',
        encoding: 'utf8'
      });

      // open append file stream
      this.stream.once('open', function () {
        track.set('output');
      });

      // on windows we will convert \n to \r\n
  	  if (process.platform === 'win32') {
        var write = this.stream.write;
        this.stream.write = function () {
          arguments[0] = arguments[0].toString().replace(/\r?\n/g, '\r\n');
          return write.apply(this, arguments);
        };
      }

      // stdout and stderr streams do already exist before the process
      // is spawned. Note the process spawn when calling this.ready method.
      this.stdout.pipe(this.stream);
      this.stderr.pipe(this.stream);

      // when stream is open
      this.stream.on('open', function () {
        // check that no previous error was given
        if (self.error) {
          var time = new Date();
          self.write('=== ! An error occured in the monitor ! ===');
          self.write('Time: ' + time.toString());
          self.write(self.error);
          self.write(' === error message end ===');
        }
      });

      // handle events: process, daemon, monitor
      var messages = {
        daemon : {
          start: '=== daemon#{pid} started for first time ===',
          restart: '=== ! daemon#{pid} restarted ! ==='
        },
        monitor: {
          start: '=== monitor#{pid} started for first time ===',
          restart: '=== ! monitor#{pid} restarted ! ==='
        },
        process: {
          start: '=== process#{pid} started for first time ===',
          restart: '=== ! process#{pid} restarted ! ===',
          stop: '=== ! process terminated ! ==='
        }
      };

      // will write the message given in the message object and
      // write the current time and date.
      var outputHandle = function (name) {
        return function (state) {
          // Write to output stream
          var time = new Date();
          self.write(messages[name][state].replace('{pid}', self.pid[name]));
          self.write('=== Time: ' + time.toString());
        };
      };

      this.on('daemon', outputHandle('daemon'));
      this.on('monitor', outputHandle('monitor'));
      this.on('process', outputHandle('process'));
    }

    // create a static pid file stream
    if (this.options.pidFile === null) {
      track.set('pidFile');
    } else {
      this.pidStream = equilibrium(this.options.pidFile);

      // open static file stream
      this.pidStream.open();
      this.pidStream.once('open', function () {
        track.set('pidFile');
      });

      // will update the pid file
      var pidHandle = function () {
        // Update pid file
        self.update();
      };

      this.on('daemon', pidHandle);
      this.on('monitor', pidHandle);
      this.on('process', pidHandle);
    }
  }
  util.inherits(Monitor, immortal.MonitorAbstract);
  exports.Monitor = Monitor;

  // write to output file
  Monitor.prototype.write = function (text) {
    this.stream.write(text + '\n');
  };

  // Update pidfile
  Monitor.prototype.update = function () {
    this.pidStream.write(this.pid);
  };

  // check monitor options
  var exists = fs.exists || path.exists;
  exports.check = function (options, callback) {

    // when all async tests execute callback
    var track = new helpers.ProgressTracker(callback);
    track.add(['output', 'pidFile']);

    doCheck('output');
    doCheck('pidFile');

    function doCheck(property) {
      // do not create an output folder
      if (options[property] === null) {
        track.set(property);
      }

      // path is not a string
      else if (typeof options[property] !== 'string') {
        callback(new Error('monitor option .' + property + ' must be a string'));
      }

      // see if dirname(property) folder exists
      else {
        var filepath = options[property] = path.resolve(options[property]);
        exists(path.dirname(filepath), function (exist) {
          if (exist === false) {
            callback(new Error('the file path given by monitor option .' + property + ' do not exist'));
            return;
          }
          track.set(property);
        });
      }
    }

  };

})();
