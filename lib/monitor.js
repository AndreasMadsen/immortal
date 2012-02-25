/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var fs = require('fs');
  var path = require('path');

  var immortal = require('./module.js');

  function Monitor() {
    immortal.MonitorAbstract.apply(this, arguments);
    var self = this;

    // create a write stream, the file path was checked by exports.check
    this.stream = fs.createWriteStream(this.options.output);

    // on windows we will convert \n to \r\n
	  if (process.platform === 'win32') {
      console.log('createing linebreak parser');
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

      // we can spawn the process
      self.ready();
    });

    // handle events: process, daemon, monitor
    var messages = {
      daemon : {
        start: ' === daemon started for first time ===',
        restart: '=== ! daemon restarted ! ==='
      },
      monitor: {
        start: '=== monitor started for first time ===',
        restart: '=== ! monitor restarted ! ==='
      },
      process: {
        start: '=== process stated for first time ===',
        restart: '=== ! process restarted ! ===',
        stop: '=== ! process terminated ! ==='
      }
    };

    // will write the message given in the message object and
    // write the current time and date.
    var handle = function (name) {
      return function (state) {
        var time = new Date();
        self.write(messages[name][state]);
        self.write('=== Time: ' + time.toString());
      };
    };

    this.on('daemon', handle('daemon'));
    this.on('monitor', handle('monitor'));
    this.on('process', handle('process'));
  }
  util.inherits(Monitor, immortal.MonitorAbstract);
  exports.Monitor = Monitor;

  // write to output file
  Monitor.prototype.write = function (text) {
    this.stream.write(text + '\n');
  };

  // check monitor options
  var exists = fs.exists || path.exists;
  exports.check = function (options, callback) {

    if (typeof options.output !== 'string') {
      callback(new Error('monitor option .output must be a string'));
      return;
    }

    // resolve filepath
    options.output = path.resolve(options.output);

    // se if dirname(output) folder exists
    exists(path.dirname(options.output), function (exist) {
      if (exist === false) {
        callback(new Error('the file path given by monitor option .output do not exist'));
        return;
      }
      callback(null);
    });
  };

})();
