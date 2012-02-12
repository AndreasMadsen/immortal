/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var child_process = require('child_process');

  function mergeObject(to, from) {
    for (var key in from) {
      to[key] = from[key];
    }
    return to;
  }

  var options = JSON.parse(process.env.immortalOptions);
  var child;

  if (options.deamon) {
    // start a deamon process
    child = child_process.spawn(process.execPath, ['./lib/deamon.js'], {
      env: process.env,
      customFds: [-1,-1,-1]
    });

  } else {
    // start a normal process
    child = child_process.spawn(options.exec, [options.file].concat(options.args), {
      env: options.env,
      customFds: [-1,-1,-1]
    });
  }

  child.stdin.destroy();

  var missing = 2;
  var done = function () {
    missing -= 1;
    if (missing === 0) {
      // kill process this will deattach the new process from the parent
      process.nextTick(function () {
        process.exit(0);
      });
    }
  }

  // close all connections
  child.stdin.destroy();
  child.stderr.on('close', done);
  child.stderr.destroy();
  child.stdout.on('close', done);
  child.stdout.destroy();

})();
