/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var helpers = require('./core/helpers.js');
  var path = require('path');
  var core = require(path.join(helpers.core, 'core.js'));

  exports.MonitorAbstract = require(path.join(helpers.core, '/monitorAbstract.js'));

  // this is accturlly just a lot of checks and arguments parseing
  // so we can catch most errors in the current process and not in an unattached process.
  exports.start = function (file /*, [execArgs], [options], [callback]*/) {

    var args = helpers.toArray(arguments);

    // get callback
    var callback;
    if (typeof args[args.length - 1] === 'function') {
      callback = args.pop();
    } else {
      throw new TypeError('callback is missing');
    }

    // get full path
    if (typeof file !== 'string') {
      callback(new TypeError('file must be a string')); return;
    }
    file = path.resolve(file);

    // parse args and options
    var execArgs, options;
    if (Array.isArray(args[1])) {
      execArgs = args[1];
      options = args.length === 3 ? args[2] : {};
    } else {
      execArgs = [];
      options = args.length === 2 ? args[1] : {};
    }

    // check options is an object
    if (typeof options !== 'object' || options === null) {
      callback(new TypeError('options is not an object')); return;
    }

    // ensure only allowed options exists and default them
    function exists(name) {
      return (options[name] !== undefined);
    }
    var isMonitor = exists('montor');

    options = {
      file: file,
      args: execArgs,
      exec: exists('exec') ? options.exec : process.execPath,
      env: exists('env') ? options.env : process.env,
      mode: exists('mode') ? options.mode : 'unattached',
      monitor: isMonitor ? options.monitor : path.join(helpers.lib, 'monitor.js'),
      options: exists('options') ? options.options : {}
    };

    // option: exec
    if (typeof options.exec !== 'string') {
      callback(new TypeError('options.exec must be a string')); return;
    }
    // option: env
    if (typeof options.env !== 'object' || options.env === null) {
      callback(new TypeError('options.env must be an opbject')); return;
    }
    // option: mode
    if (options.mode !== 'development' && options.mode !== 'unattached' && options.mode !== 'daemon') {
      callback(new TypeError('options.mode is not supported')); return;
    }
    // option: monitor
    if (typeof options.monitor !== 'string') {
      callback(new TypeError('options.monitor must be a string')); return;
    }

    // option.option: output
    if(!isMonitor && typeof options.options.output !== 'string') {
      callback(new TypeError('the monitor option output must be a string')); return;
    }

    // check monitor
    try {
      options.monitor = require.resolve(options.monitor);
    } catch (e) {
      callback(new Error('options.monitor is not a valid module string')); return;
    }

    // this are async tests so we need a progress tracker
    var progress = new helpers.ProgressTracker(execFile);

    // check file paths
    function checkPath(name, path) {
      progress.add(name);
      helpers.exists(path, function (exist) {
        if (!exist) {
          callback(new Error(name + ' was not found (' + path + ')')); return;
        }
        progress.set(name);
      });
    }

    checkPath('file', file);
    checkPath('monitor', options.monitor);
    checkPath('exec', options.exec);
    if (!isMonitor) {
      checkPath('output', path.dirname(options.options.output));
    }

    // this will execute when all tests are made
    function execFile() {
      var child;

      if (options.mode === 'development') {
        child = core.spawnPump(options);
        child.streamPump(process);
      } else {
        child = core.spawnProcess(options);
        child.close();
      }

      callback(null);
    }
  };

})();
