/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  // windows do not require a native code
  if (process.platform === 'win32') {
    console.log('windows do not require any installation');
    process.exit(0); return;
  }

  var fs = require('fs');
  var path = require('path');
  var existsFile = fs.exists || path.exists;

  var helpers = require('../lib/helpers.js');

  // color codes
  var esc = String.fromCharCode(27);
  var reset = esc + "[0m";
  var red = esc + "[31m";
  var green = esc + "[32m";
  var yellow = esc + "[33m";

  // detect detached spawn support
  if (helpers.support.detached) {
    process.stdout.write(green);
    console.log('your node version supports detached spawn');
    process.stdout.write(reset);
    process.exit(0); return;
  }

  // platform map
  var platform = {
    linux64: 'linux',
    linux: 'linux',
    darwin: 'darwin'
  };

  // reset colors
  process.stdout.write(reset);

  // check that os is supported
  var os = platform[process.platform];
  if (os === undefined) {
    process.stderr.write(yellow);
    console.error('you os ' + process.platform + ' is not supported, please file an issue');
    process.stderr.write(reset);

    process.exit(1); return;
  }

  // get paths
  var from = path.join(helpers.root, 'src/out', 'execute-' + os);
  var to = helpers.executable('execute');

  // print error text
  function printError(error) {
    process.stderr.write(red);
    console.error(error.trace);
    process.stderr.write(yellow);
    console.error('an error occurred, please file an issue');
    process.stderr.write(reset);
    process.exit(1);
  }

  function createSymlink() {
    fs.symlink(from, to, 'file', function (error) {
      if (error) return printError(error);

      // success
      process.stdout.write(green);
      console.log('installation complete');
      process.stdout.write(reset);
      process.exit(0); return;
    });
  }

  // Create the symlink
  existsFile(to, function (exists) {

    // If file don't exist create a symlink
    if (exists === false) return createSymlink();

    // Remove file
    fs.unlink(to, function (error) {
      if (error) return printError(error);

      createSymlink();
    });
  });

})();
