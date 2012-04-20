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

  function FileWatcher(filepath, callback) {
    var self = this;

    // Save filepath
    this.filepath = filepath;

    // Start content is empty
    this.buffer = '';
    this.position = 0;

    // Query list
    this.query = 0;
    this.reading = false;

    // Line cache
    this.paused = true;
    this.cache = [];

    function nextRead() {
      // continue query
      if (self.query === 0) {
        self.reading = false;
      } else {
        self.readFileUpdate();
      }
    }

    this.readFileUpdate = function() {
      // Read file content
      self.reading = true;
      fs.fstat(self.fd, function (error, stat) {
        if (error) throw error;

        // Update and set position
        var position = self.position;
        var bufferSize = stat.size - position;
        self.position = stat.size;

        // Skip reading if there where no changes
        if (bufferSize === 0) {
          nextRead();
          return;
        }

        // Read filechanges
        var buffer = new Buffer(bufferSize);
        fs.read(self.fd, buffer, 0, bufferSize, position, function (error) {
          if (error) throw error;

          // reading stoped
          if (self.query !== 0) {
            self.query -= 1;
          }

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

          nextRead();
        });
      });
    }

    function createWatching() {
      common.exists(filepath, function (exists) {
        if (exists === false) {
          setTimeout(createWatching, 50);
          return;
        }

        // Open file and read full content
        fs.open(filepath, 'r', '0666', function (error, fd) {
          if (error) throw error;
          self.fd = fd;

          // Read file for first time
          self.query += 1;
          self.readFileUpdate();

          // Start file a watcher
          self.stream = fs.watch(filepath, { persistent: true }, function (event) {
            if (event === 'change') {
              self.query += 1;

              // If we are already reading add a read to the query
              if (self.reading === false) {
                self.readFileUpdate();
              }
            }
          });
        });
      });
    }

    // Remove file if exist
    common.exists(filepath, function (exists) {
      if (exists === false) {
        createWatching(filepath);
        process.nextTick(callback);
        return;
      }

      fs.unlink(filepath, function (error) {
        if (error) throw error;
        createWatching(filepath);
        process.nextTick(callback);
      });
    });

  }
  util.inherits(FileWatcher, events.EventEmitter);
  exports.FileWatcher = FileWatcher;

  // store lines in cache
  FileWatcher.prototype.pause = function () {
    this.paused = true;
  };

  // drain cache and discontinue line storeing
  FileWatcher.prototype.resume = function () {
    this.paused = false;
    while (this.cache.length !== 0 && this.paused === false) {
      this.emit('line', this.cache.splice(0, 1)[0]);
    }
  };

  // Stop reading
  FileWatcher.prototype.close = function () {
    this.query = 0;
    this.stream.close();
    fs.close(this.fd);
  };

})();
