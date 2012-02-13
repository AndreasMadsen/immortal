/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var immortal = require('./module.js');
  var util = require('util');
  var fs = require('fs');

  function Monitor() {
    immortal.MonitorAbstract.apply(this, arguments);
    var self = this;

    var stream = fs.createWriteStream(this.options.output);
    stream.on('open', function () {
      self.stdout.pipe(stream);
      self.stderr.pipe(stream);

      self.ready();
    });

    this.on('spawn', function () {
      stream.write('spawning process');
    });
    this.on('respawn', function () {
      stream.write('respawning process');
    });
    this.on('exit', function () {
      stream.write('process died');
    });
  }
  util.inherts(Monitor, immortal.Monitor);
  module.exports = Monitor;

})();
