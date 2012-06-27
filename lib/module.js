/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var path = require('path');

  var helpers = require('./helpers.js');
  var core = helpers.core('core');

  // export the monitor abstraction object
  exports.MonitorAbstract = helpers.core('monitor');

  // this is accturlly just a lot of checks and arguments parseing
  // so we can catch most errors in the current process and not in an unattached process.
  exports.start = function (file /*, [options], callback*/) {

    var args = helpers.toArray(arguments);

    // get callback
    var cb;
    if (typeof args[args.length - 1] === 'function') {
      cb = args.pop();
    } else {
      throw new TypeError('callback is missing');
    }

    // callback wrapper
    var hasCalled = false;
    var callback = function (error) {
      if (hasCalled) return;
      hasCalled = true;
      cb(error);
    };

    // get full path
    if (typeof file !== 'string') {
      callback(new TypeError('file must be a string')); return;
    }
    file = path.resolve(file);

    // parse args and options
    var options = args.length === 2 ? args[1] : {};

    // check options is an object
    if (typeof options !== 'object' || options === null) {
      callback(new TypeError('options is not an object')); return;
    }

    // ensure only allowed options exists and default them
    function exists(name) {
      return (options[name] !== undefined);
    }
    var isMonitor = exists('monitor');

    options = {
      file: file,
      args: exists('args') ? options.args : [],
      env: exists('env') ? options.env : process.env,
      strategy: exists('strategy') ? options.strategy : 'unattached',
      monitor: isMonitor ? options.monitor : path.join(helpers.lib, 'monitor.js'),
      options: exists('options') ? options.options : {},
      auto: exists('auto') ? !!options.auto : true,
      relay: exists('relay') ? !!options.relay : true,
      bufferLimit: exists('bufferLimit') ? options.bufferLimit : 1024*1024
    };

    // option: args
    if (!Array.isArray(options.args)) {
      callback(new TypeError('options.args must be an array')); return;
    }
    // option: env
    if (typeof options.env !== 'object' || options.env === null) {
      callback(new TypeError('options.env must be an object')); return;
    }
    // option: strategy
    if (['development', 'unattached', 'daemon'].indexOf(options.strategy) === -1) {
      callback(new TypeError('options.strategy is not supported')); return;
    }
    // option: monitor
    if (typeof options.monitor !== 'string') {
      callback(new TypeError('options.monitor must be a string')); return;
    }
    // option: monitor
    if (typeof options.bufferLimit !== 'number' && options.bufferLimit <= 0) {
      callback(new TypeError('bufferLimit must be a positive number')); return;
    }

    // check monitor
    try {
      options.monitor = require.resolve(options.monitor);
    } catch (e) {
      callback(new Error('options.monitor is not a valid module string')); return;
    }

    // this are async tests so we need a progress tracker
    var progress = new helpers.ProgressTracker(execFile);
    progress.add(['file', 'monitor', 'symlink']);

    // check file paths
    function checkPath(name, path) {
      helpers.exists(path, function (exist) {
        if (!exist) {
          callback(new Error(name + ' was not found (' + path + ')')); return;
        }
        progress.set(name);
      });
    }

    checkPath('file', file);

    // check symlink
    if (process.platform === 'win32' || helpers.support.detached) {
      progress.set('symlink');
    } else {
      helpers.exists(helpers.executable('execute'), function (exist) {
        if (!exist) {
          callback(new Error('npm install was not executed')); return;
        }
        progress.set('symlink');
      });
    }

    // check monitor options
    try {
      require(options.monitor).check(options.options, function (error) {
        if (error) {
          callback(error); return;
        }
        progress.set('monitor');
      });
    } catch (e) {
      callback(e);
    }

    // this will execute when all tests are made
    function execFile() {
      var child;

      if (options.strategy === 'development') {
        child = core.spawnPump(options, false, false);
        if (options.relay) child.pump(process);
      } else if (options.strategy === 'unattached') {
        child = core.spawnPump(options, true, false);
      } else if (options.strategy === 'daemon') {
        child = core.spawnDaemon(options, true);
      }

      // start child
      child.spawn();

      child.on('start', function () {
        callback(null);
      });
    }

  };

})();
