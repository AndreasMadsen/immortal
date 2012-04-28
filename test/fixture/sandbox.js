
var common = require('../common.js'),
    immortal = require(common.immortal);

immortal.start(common.fixture('pingping.js'), {
  'strategy': 'development',
  'auto': false,
  'options': {
    pidFile: null,
    output: null
  }
}, function () {});
