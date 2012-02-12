/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var child_process = require('child_process');
  var fs = require('fs');

  function mergeObject(to, from) {
    for (var key in from) {
      to[key] = from[key];
    }
    return to;
  }

  var options = JSON.parse(process.env.immortalOptions);

  // this streams will be reused
  var stderr = fs.createWriteStream(options.stderr);
  var stdout = fs.createWriteStream(options.stdout);

  var missing = 2;
  var done = function () {
    missing -= 1;
    if (missing === 0) startChild();
  };
  stdout.on('open', done);
  stderr.on('open', done);

  function startChild() {
    var child = child_process.spawn(options.exec, [options.file].concat(options.args), {
      env: options.env
    });

    // pipe stderr and stdout to file
    child.stderr.pipe(stderr);
    child.stdout.pipe(stdout);

    // keep process alive unless it exited by purpose
    child.on('exit', function (code) {
      if (code !== 0) {
        // TODO, restart deamon from option.file if deamon die
        startChild();
      }
    });
  }

})();
