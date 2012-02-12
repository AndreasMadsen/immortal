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

## API documentation

```JavaScript
var immortal = require('immortal');
```

### Start a new process

To start a new process simply use `immortal.start(file, [args], [options])`.

This function will start a new process, but unlike the `.spawn()` or `.fork()` method
given my node core, the new process will be detached from its parent. Allowing the parent
to die graceful.

The function takes an optional argument there can contain the following properties:

* **exec:** the file there will be executed - it will default to process.execPath
* **env:** the envorment the new process will run in
* **mode:** this can be `development`, `unattached` or `daemon`.
 * `development`: the new process will be attached to its parent so all outout is
    piped to both monitor and parent.
 * `unattached`: this is the default, it will execute the new process unattached
    to its parent and pipe output to monitor,
    but process will not be keeped alive.
 * `daemon`: the process will be unattached to its parent, output will be piped
    to the monitor and the process will respawn when it dies.
* **monitor:** path or name of module where a monitor module exist, this will default to an
  simple monitor module there already exist. But it will simply log the output to a file,
  should you wish anything more you will have to create you own.
* **options:** this are extra options parsed to the monitor object. The default
  monitor takes only a `output` property.

```JavaScript
immortal.start('process.js', process.argv[0], {
  exec: process.execPath,
  env: process.env,
  mode: 'daemon',
  options: {
    output: 'output.log'
  }
});
```

### Monitor

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
```

To be continued ... :)

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
