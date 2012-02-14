
var common = require('../common.js');
var path = require('path');
var immortal = require(common.module);

immortal.start(path.join(common.fixture, 'longlived.js'), [], {
  mode: 'daemon',
  options: {
    output: path.join(common.temp, 'daemon.txt')
  }
}, function (err) {
  if (err !== null) throw err;
});
