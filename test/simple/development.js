
var common = require('../common.js');
var path = require('path');
var immortal = require(common.module);

immortal.start(path.join(common.fixture, 'longlived.js'), [], {
  mode: 'development',
  options: {
    output: path.join(common.temp, 'development.txt')
  }
}, function (err) {
  if (err !== null) throw err;
});
