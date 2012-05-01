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

  /**
   * FileWatcher abstract used by LineWatcher and JsonWatcher
   */
  function FileWatcher(filepath) {
    var self = this;

    // store static info
    this.filepath = filepath;
    this.fd = null;

    // query keeper
    this.reading = false;
    this.stoped = false;
    this.paused = true;
    this.query = 0;
    this.cache = [];

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
      if (self.stoped) return;

      if (exists === false) {
        setTimeout(function () {
          self.beginWatcher();
        }, 50);
        return;
      }

      // Emit created event
      self.emit('created');

      // Open file and read full content
      fs.open(self.filepath, 'r', '0666', function (error, fd) {
        if (error) return self.emit('error', error);
        self.fd = fd;

        // get the first reading
        self.query += 1;
        self.updateStat(function () {

          // Start file a watcher
          if (process.platform !== 'win32') {
            self.stream = fs.watch(self.filepath, { persistent: true }, function (event) {
              if (event === 'change') {
                self.pushQuery();
              }
            });
          }

        });
      });
    });
  };

  FileWatcher.prototype.pushQuery = function (callback) {
    // push to query
    this.query += 1;

    // update stat
    if (this.reading === false) {
      this.updateStat();
    }
  };

  FileWatcher.prototype.updateStat = function (callback) {
    var self = this;

    this.reading = true;

    function next() {
      if (callback) callback();

      if (self.query === 0) {
        self.reading = false;
      } else {
        self.updateStat();
      }
    }

    function handle(emit) {
      // one more done
      self.query -= 1;

      // execute callbacks
      self.emit('modified', next, function (respons) {
        if (self.paused) {
          self.cache.push(respons);
        } else {
          respons();
        }
      });
    }

    // get new stats
    fs.fstat(this.fd, function (error, stat) {
      if (error) return self.emit('error', error);

      self.stat = stat;
      return handle();
    });
  };

  // store lines in cache
  FileWatcher.prototype.pause = function () {
    this.paused = true;

    if (process.platform === 'win32') {
      clearTimeout(this.stream);
    }
  };

  // drain cache and discontinue line storeing
  FileWatcher.prototype.resume = function () {
    var self = this;

    this.paused = false;
    while (this.cache.length !== 0 && this.paused === false) {
      this.cache.splice(0, 1)[0]();
    }

    if (process.platform === 'win32') {
      self.stream = setTimeout(function check(event) {
        if (self.fd) {
          self.pushQuery();
          setTimeout(check, 150);
        }
      }, 150);      
    }
  };

  // Stop file watcher
  FileWatcher.prototype.close = function () {
    this.pause();
    this.query = 0;

    this.stoped = true;
    if (this.stream) {
      if (process.platform = 'win32') {
        clearTimeout(this.stream);
      } else {
        this.stream.close();        
      }
      this.stream = null;
    }
    if (this.fd) {
      fs.close(this.fd);
      this.fd = null;
    }
  };

  /**
   * LineWatcher will emit line event when new lines are added
   */
  function LineWatcher(filepath, callback) {
    FileWatcher.call(this, filepath);
    this.once('ready', callback);

    this.position = 0;
    this.buffer = '';

    this.on('modified', this.updateFile.bind(this));
  }
  util.inherits(LineWatcher, FileWatcher);
  exports.LineWatcher = LineWatcher;

  // read file changes
  LineWatcher.prototype.updateFile = function (done, callback) {
    var self = this;

    // Update and set position
    var position = this.position;
    var bufferSize = this.stat.size - position;
    self.position = this.stat.size;

    // Skip reading if there where no changes
    if (bufferSize === 0) {
      return done();
    }

    // Read filechanges
    var buffer = new Buffer(bufferSize);
    fs.read(this.fd, buffer, 0, bufferSize, position, function (error) {
      if (error) return self.emit('error', error);

      // add buffer content
      var i, start = 0;
      self.buffer += buffer.toString();

      // read by each line
      while ((i = self.buffer.indexOf('\n', start)) >= 0) {

        var returnChar = (self.buffer[i - 1] === '\r') ? 1 : 0;

        var line = self.buffer.slice(start, i - returnChar);

        // emit line event or add to cache
        callback(self.emit.bind(self, 'line', line));

        start = i + 1;
      }
      self.buffer = self.buffer.slice(start);

      // read again if there is a query
      return done();
    });
  };

  /**
   * JsonWatcher will emit when a json file is updated
   */
  function JsonWatcher(filepath, callback) {
    FileWatcher.call(this, filepath);
    this.once('ready', callback);

    this.buffer = '';
    this.on('modified', this.updateFile.bind(this));
  }
  util.inherits(JsonWatcher, FileWatcher);
  exports.JsonWatcher = JsonWatcher;

  // read file changes
  JsonWatcher.prototype.updateFile = function (done, callback, tryTimes) {
    var self = this;

    // In case of a JSON parse error, we will try again but only 10 times
    tryTimes = tryTimes || 0;

    // Update and set position
    var bufferSize = this.stat.size;

    // Skip reading if there where no changes
    if (bufferSize === 0) {
      return done();
    }

    // Read filechanges
    var buffer = new Buffer(bufferSize);
    fs.read(this.fd, buffer, 0, bufferSize, 0, function (error) {
      if (error) return self.emit('error', error);

      var content = buffer.toString();

      // if the content hasn't changed
      if (self.buffer === content) {
        return done();
      }

      // store current
      self.buffer = content;

      // add buffer content
      try {
        callback(self.emit.bind(self, 'update', JSON.parse(content)));
      } catch (e) {
        // try again (hopefully the content has changed)
        if (tryTimes === 10) {
          callback(self.emit.bind(self, 'error', e));
        } else {
          return self.updateFile(done, callback, tryTimes + 1);
        }
      }

      // read again if there is a query
      return done();
    });
  };

})();
