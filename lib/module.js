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

  exports.start = function (file, args, options) {

    // create deamon option string
    var optionString = JSON.stringify({
      deamon: !!options.deamon,
      exec: options.exec ? options.exec : process.execPath,
      file: file,
      args: args,
      env: options.env ? options.env : process.env,
      stdout: options.stdout,
      stderr: options.stderr
    });

    // spawn a process, there will:
    // 1. spawn another process
    // 2. kill itself
    // result is that the process will be deattached
    var child = child_process.spawn(process.execPath, ['./lib/start.js'], {
      env: mergeObject({immortalOptions: optionString}, process.env),
      customFds: [-1,-1,-1]
    });

    // close all channels, we want minimal connection
    child.stdin.destroy();
    child.stderr.destroy();
    child.stdout.destroy();
  };

})();