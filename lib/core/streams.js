/**
 * Copyright (c) 2012 Andreas Madsen
 * MIT License
 */

(function () {
  "use strict";

  var util = require('util');
  var events = require('events');
  var Stream = require('stream');

  // node 0.4 compatibility
  // Stream is not a constructor but Stream.Stream is
  if (typeof Stream !== 'function') {
    Stream = Stream.Stream;
  }

  /**
   * This constructor will simply relay data
   * by purpose this do not support .end or .close
   */
  function RelayStream(option) {
    Stream.apply(this, arguments);
    this.writable = true;
    this.readable = true;

    this.store = [];
    this.paused = !!option.paused;
    this.closed = false;
  }
  util.inherits(RelayStream, Stream);
  exports.RelayStream = RelayStream;

  RelayStream.prototype.pause = function () {
    this.paused = true;
  };

  // NOTE: if something is std outputted here and the strategy is set to development
  // the monitor will go intro an infinity loop. Because process.stdout.write will cause
  // a drain emit, and child.pump(process) will handle a drain event by executeing resume.
  // The resume function will then output something with then again cause a drain emit.
  RelayStream.prototype.resume = function () {
    while (this.store.length !== 0) {
      this.emit('data', this.store.shift());
    }
    this.paused = false;
  };

  RelayStream.prototype.write = function (chunk) {
    if (this.closed) {
      this.emit('error', new Error('stream not open'));
      return false;
    }

    if (this.paused) {
      this.store.push(chunk);
      return false;
    }

    this.emit('data', chunk);
    return true;
  };

  RelayStream.prototype.close = function () {
    // ignore close
  };

  RelayStream.prototype.end = function (chunk) {
    if (arguments.length < 0) {
      this.write(chunk);
    }
    this.close();
  };

  /**
   * This constructor will create a I/O line stream
   * from a writable and readable stream
   */
  function LineStream(writeStream, readStream) {
    var self = this;
    this.writeStream = writeStream;
    this.readStream = readStream;

    // resume streams
    this.readStream.resume();

    // save data in this buffer
    this.buffer = "";

    // new data from stream will be handled by this
    this.readStream.on('data', function (chunk) {
      self.buffer += chunk;

      // go through the buffer and isolate each message by a linebreak
      var i, start = 0;
      while ((i = self.buffer.indexOf('\n', start)) >= 0) {

        // parse line as JSON and emit line
        self.emit('message', JSON.parse(self.buffer.slice(start, i)));
        start = i + 1;
      }
      self.buffer = self.buffer.slice(start);
    });
  }
  util.inherits(LineStream, events.EventEmitter);
  exports.LineStream = LineStream;

  // flush buffer, usful when the process restart
  LineStream.prototype.flush = function () {
    this.buffer = "";
  };

  // send message by JSON stringify the message and add a linebreak
  LineStream.prototype.send = function (message) {
    this.writeStream.write(JSON.stringify(message) + '\n');
  };

})();
