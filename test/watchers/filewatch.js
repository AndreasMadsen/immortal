/**
* Copyright (c) 2012 Andreas Madsen
* MIT License
*/

(function () {
  "use strict";

  var fs = require('fs');
  var util = require('util');
  var events = require('events');

  var common = require('../common.js');

  function FileWatcher(filepath) {
    var self = this;

    // store static info
    this.filepath = filepath;
    this.fd = null;

    // query keeper
    this.internal = {
      reading: false,
      stoped: false,
      query: 0
    };

    // new and old file stat
    this.stat = null;

    // Remove file if exist
    common.exists(filepath, function (exists) {
      if (exists === false) {
        self.beginWatcher();
        self.emit('ready');
        return;
      }

      fs.unlink(filepath, function (error) {
        if (error) throw error;
        self.beginWatcher();
        self.emit('ready');
      });
    });
  }
  util.inherits(FileWatcher, events.EventEmitter);
  exports.FileWatcher = FileWatcher;

  FileWatcher.prototype.beginWatcher = function () {
    var self = this;

    common.exists(this.filepath, function (exists) {
      if (self.internal.stoped) return;

      if (exists === false) {
        setTimeout(self.beginWatcher.bind(self), 50);
        return;
      }

      // Emit created event
      self.emit('created');

      // Open file and read full content
      fs.open(self.filepath, 'r', '0666', function (error, fd) {
        if (error) return self.emit('error', error);
        self.fd = fd;

        // get the first reading
        self.internal.query += 1;
        self.updateStat(function () {

          // Start file a watcher
          self.stream = fs.watch(self.filepath, { persistent: true }, function (event) {
            if (event === 'change') {

              // push to query
              self.internal.query += 1;

              // update stat
              if (self.internal.reading === false) {
                self.updateStat();
              }
            }
          });
        });
      });
    });
  };

  FileWatcher.prototype.updateStat = function (callback) {
    var self = this;

    this.internal.reading = true;

    function next(emit) {
      // one more done
      self.internal.query -= 1;

      // execute callbacks
      if (emit) {
        if (callback) callback();
        self.emit('modified');
      }

      // handle next query
      if (self.internal.query === 0) {
        self.internal.reading = false;
      } else {
        self.updateStat();
      }
    }

    // get new stats
    fs.fstat(this.fd, function (error, stat) {
      if (error) return self.emit('error', error);

      var current = self.stat;
      self.stat = stat;

      // save as old and new if this is the first read
      if (current === null) {
        return next(true);
      }

      // if the file has been modified update stats and execute callback
      return next( stat.mtime.getTime() > current.mtime.getTime() );
    });
  };

  // Stop file watcher
  FileWatcher.prototype.stopWatcher = function () {
    this.internal.stoped = true;
    if (this.stream) {
      this.stream.close();
      this.stream = null;
    }
    if (this.fd) {
      fs.close(this.fd);
      this.fd = null;
    }
  };


  function LineWatcher(filepath, callback) {
    var self = this;
    FileWatcher.call(this, filepath);
    this.once('ready', callback);

    this.reading = false;
    this.query = 0;

    this.paused = true;
    this.position = 0;
    this.cache = [];
    this.buffer = '';

    this.on('modified', function () {
      self.query += 1;
      if (self.reading === false) {
        self.readFileUpdate();
      }
    });
  }
  util.inherits(LineWatcher, FileWatcher);
  exports.LineWatcher = LineWatcher;

  // read file changes
  LineWatcher.prototype.readFileUpdate = function () {
    var self = this;

    // Read file content
    this.reading = true;

    function next() {
      // one more done
      self.query -= 1;

      // next in query
      if (self.query === 0) {
        self.reading = false;
      } else {
        self.readFileUpdate();
      }
    }

    // Update and set position
    var position = this.position;
    var bufferSize = this.stat.size - position;
    self.position = this.stat.size;

    // Skip reading if there where no changes
    if (bufferSize === 0) {
      return next();
    }

    // Read filechanges
    var buffer = new Buffer(bufferSize);
    fs.read(self.fd, buffer, 0, bufferSize, position, function (error) {
      if (error) throw error;

      // add buffer content
      var i, start = 0;
      self.buffer += buffer.toString();

      // read by each line
      while ((i = self.buffer.indexOf('\n', start)) >= 0) {
        var line = self.buffer.slice(start, i);

        // emit line event or add to cache
        if (self.paused) {
          self.cache.push(line);
        } else {
          self.emit('line', line);
        }

        start = i + 1;
      }
      self.buffer = self.buffer.slice(start);

      // read again if there is a query
      return next();
    });
  };

  // store lines in cache
  LineWatcher.prototype.pause = function () {
    this.paused = true;
  };

  // drain cache and discontinue line storeing
  LineWatcher.prototype.resume = function () {
    this.paused = false;
    while (this.cache.length !== 0 && this.paused === false) {
      this.emit('line', this.cache.splice(0, 1)[0]);
    }
  };

  // Stop reading
  LineWatcher.prototype.close = function () {
    this.pause();
    this.query = 0;
    this.stopWatcher();
  };

})();
