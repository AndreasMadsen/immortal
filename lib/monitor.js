/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var immortal = require('./module.js');
  var util = require('util');
  var fs = require('fs');
  var path = require('path');

  function Monitor() {
    immortal.MonitorAbstract.apply(this, arguments);
    var self = this;


    var stream = this.stream = fs.createWriteStream(this.options.output);
    stream.on('open', function () {
      self.stdout.pipe(stream);
      self.stderr.pipe(stream);

      self.ready();
    });

    this.on('spawn', function () {
      stream.write('spawning process\n');
    });
    this.on('respawn', function () {
      stream.write('respawning process\n');
    });
    this.on('exit', function () {
      stream.write('process died\n');
    });
  }
  util.inherits(Monitor, immortal.MonitorAbstract);
  exports.Monitor = Monitor;

  Monitor.prototype.setup = function (why, message) {
    this.stream.write(why + "\n");
    if (message !== "") {
      this.stream(message + "\n");
    }
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
