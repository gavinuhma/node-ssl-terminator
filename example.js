var Terminator = require('./lib/terminator');
var terminator = new Terminator();

var fs = require('fs');
var options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt'),
  ca: [fs.readFileSync('./ca.crt')],
  ciphers: 'ALL:!LOW:!DSS:!EXP'
};

terminator
  .listen(443)
  .forward(80, 'localhost')
  //.hideErrors()
  .hideLogs();

terminator.start(options, function() {
  console.log('SSL terminator started!');
});

process.on('uncaughtException', function (err) {
  console.error('\n', 'process.uncaughtException', err);
});
