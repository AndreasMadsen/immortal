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

### Start a unattached deamon process

```JavaScript
  immortal.start('./process.js', process.argv, {
    exec: process.execPath, // in case you want to use coffee script
    env: process.env, // all environment variables
    stderr: './err.log', // log error output to this file
    stdout: './out.log', // log std output to this file
    deamon: true // run as deamon, if false then the process will only be unattached
  });
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
