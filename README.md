#immortal

**Immortal creates node deamons without using native code.**

> Most tools used to create deamons use native code, this adds complexity because
> they need to be compilede and node is not very frindly when using fork(2).
>
> This module aims to be a simple API used to create deamons without using native
> code. It is the authors hope that other deamon modules will abstract upon this,
> so the never ending deamon problem can be solved.

**Be warned this is highly experminal and many features aren't implemented.**

## Features
 - JavaScript only
 - Works with node 0.4, 0.6 and 0.7

## Installation

```sheel
npm install immortal
```
## How to use

To start a new process simply use `immortal.start(file, [args], [options])`.

This function will start a new process, but unlike the `.spawn()` or `.fork()` method
given my node core, the new process will be detached from its parent. Allowing the parent
to die graceful.

The function takes an optional argument there can contain the following properties:

* **exec:** the file there will be executed - it will default to process.execPath.
* **env:** the envorment the new process will run in.
* **stategy:** this can be `development`, `unattached` or `daemon`.
* **monitor:** path or name of module where a monitor module exist, this will default to an
  simple monitor module there already exist. But it will simply log the output to a file,
  should you wish anything more you will have to create you own.
* **options:** this are extra options parsed to the monitor object. The default
  monitor takes only a `output` property.

An very simple example using the build in monitor:

```JavaScript
var immortal = require('immortal');
immortal.start('process.js', process.argv[0], {
  exec: process.execPath,
  env: process.env,
  mode: 'daemon',
  options: {
    output: 'output.log'
  }
});
```

## Strategy

This module alow you to execute a process in 3 ways, the complexity of the strategy
increases from `development`, `unattached` and to `daemon`.

The basic stategy is that `pump` spawn a `process` and keep it alive. The output from the
`process` is also relayed to a `Monitor` object there is `required` from the `pump`.

### Development

The pump is spawned directly from the `parent` and the output from both `pump` and `process`
is relayed to the `parents` `stdout` and `stderr` channel.

![Development](https://github.com/AndreasMadsen/immortal/raw/stategy/docs/Development.png)

### Unattached

The `parent` will spawn an `execute` process there will simply execute another process and
kill itself immediately after. The process executed by `execute` is in this case the pump.
Because the `pump` is unattached the output from the `process` will only be relayed to the
`monitor`.

![Unattached](https://github.com/AndreasMadsen/immortal/raw/stategy/docs/Unattched.png)

### Daemon

This parent will spawn an unattached `daemon` process there will spawn a `pump` process
and keep it alive. `stderr` output from the `pump` will be stored in the `daemons` memory
and is only send to the `monitor` through the `pump` when the `pump` respawn.

In case the `daemon` should die the `pump` will execute a new `daemon` and kill itself.
This will result in a new `pump` and `process`.

![Daemon](https://github.com/AndreasMadsen/immortal/raw/stategy/docs/Daemon.png)

## Monitor

### The basic layout

When createing a monitor object you should keep a stateless design in mind.
This means you shouldn't depend on files or databases beigin properly closed.

The monitor object should also **not** contain any `process.on('uncaughtException')`
since you can't be sure if any I/O will perform as expected after this has emitted.
And the monitor will respawn with the failure string send to it immediately after.

The monitor file itself is a module file there should return a `Monitor` constructor
there inherts from a monitor abstaction class.

```JavaScript
var util = require('util');
var immortal = require('immortal');

function Monitor() {
  immortal.MonitorAbstract.apply(this, arguments);
}
util.inherits(Monitor, immortal.MonitorAbstract);
exports.Monitor = Monitor;
```

When the `Monitor` constrcutor is called it will by default have:
* `this.options` the optional `options` object set in `immortal.start`
* `this.ready` call this function when you are ready to receive data
* `this.stdout` a readable stream relayed from `process.stdout`
* `this.stderr` a readable stream relayed from `process.stderr`

Note that both `.stdout` and `stderr` can't be closed because they don't origin from
a single process.

Extended version of previous example:

```JavaScript
var fs = require('fs');
function Monitor() {
  immortal.MonitorAbstract.apply(this, arguments);

  var output = fs.createWriteStream(this.options.output);
  output.on('open', function () {
    this.ready();
  });

  this.stderr.pipe(output);
  this.stdout.pipe(output);

  // we save the output for later use
  this.output = output;
}
```

### Options check

Because it is better to catch errors before the daemon start a `check` function should
also be provided. If no `check` function exist it will simply be skipped.

```JavaScript
var fs = require('fs');
exports.check = function (options, callback) {
  fs.exists(options.output, function (exist) {
    if (exist) {
      return callback(null);
    }
    return callback(new Error("the output file must already exist"));
  });
};
```

### Monitor events

_this is likly to change, please send me API ideas._

There are tre events, they are emitted when the process given in `immortal.start`
spawns or die.

* `respawn` this will be called when the process restart
* `spawn` this will be called when the process start for first time
* `exit` this will be called when the process die

This extend the previous given `Monitor` constrcutor:

```JavaScript
  this.on('respawn', function () {
    stream.write('process restarted');
  });
  this.on('spawn', function () {
    stream.write('process started');
  });
  this.on('exit', function () {
    stream.write('process exited');
  });
```

### Restart informations

_this is likly to change, please send me API ideas._

When the monitor or the daemon dies a deaper restart is needed. When the montor
process restart or start the `monitor.setup` will be executed with two arguments:

* `why`: says what happened can be:
 * `daemon restart` in case the daemon died
 * `pump start` in case the monitor start for first time
 * `pump restart` in case the monitor died and has been restarted
* `message` in case of `pump restart` this will contain all `stderr` output since
  the last monitor process started, so the reason is likely to be here.

```JavaScript
Monoitor.prototype.setup = function (why, message) {
  this.output.write(why);
  if (message) {
    this.output.write(message);
  }
}
```

##License

**The software is license under "MIT"**

> Copyright (c) 2012 Andreas Madsen
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.
