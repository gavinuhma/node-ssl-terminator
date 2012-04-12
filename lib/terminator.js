var tls = require('tls');
var net = require('net');

module.exports = Terminator;

function Terminator() {
  this.listenPort = 443;
  this.forwardPort = 80;
  this.forwardHost = 'localhost';

  this.ERROR = function() {
    console.error.apply(console, arguments);
  };
  this.LOG = function() {
    console.log.apply(console, arguments);
  };
}

Terminator.prototype.listen = function(port) {
  this.listenPort = port;
  return this;
};

Terminator.prototype.forward = function(port, host) {
  this.forwardPort = port;
  this.forwardHost = host || this.forwardHost;
  return this;
};

Terminator.prototype.hideErrors = function() {
  this.ERROR = false;
  return this;
};

Terminator.prototype.hideLogs = function() {
  this.LOG = false;
  return this;
};

Terminator.prototype.start = function(options, callback) {
  var that = this;
  var server = tls.createServer(options, function(cleartextStream) {
    var id = Math.floor(Math.random() * 99999999);
    that.LOG&&that.LOG(id, 'connection established', cleartextStream.servername);

    var connected = false;
    var buffers = [];

    cleartextStream.on('data', function(data) {
      if (connected) {
        forwardSocket.write(data);
      } else {
        buffers[buffers.length] = data;
      }
    });

    cleartextStream.on('error', function(err) {
      that.ERROR&&that.ERROR(id, 'cleartextStream', 'error', err);
      forwardSocket.destroy();
    });

    cleartextStream.on('end', function() {
      that.LOG&&that.LOG(id, 'cleartextStream', 'end');
    });

    cleartextStream.on('close', function() {
      that.LOG&&that.LOG(id, 'cleartextStream', 'close');
      forwardSocket.destroy();
    });

    var forwardSocket = new net.Socket();
    forwardSocket.connect(that.forwardPort, that.forwardHost, function() {
      connected = true;
      if (buffers.length > 0) {
        for (i = 0; i < buffers.length; i++) {
          forwardSocket.write(buffers[i]);
        }
      }
    });

    forwardSocket.on('data', function(data) {
      try {
        cleartextStream.write(data);
      } catch (err) {
        console.error('\n', id, 'forwardSocket', 'data', 'caught exception', err);
        forwardSocket.end();
      }
    });

    forwardSocket.on('error', function(err) {
      that.ERROR&&that.ERROR(id, 'forwardSocket', 'error', err);
      cleartextStream.end();
    });

    forwardSocket.on('end', function() {
      that.LOG&&that.LOG(id, 'forwardSocket', 'end');
    });

    forwardSocket.on('close', function(had_error) {
      that.LOG&&that.LOG(id, 'forwardSocket', 'close', had_error);
      cleartextStream.end();
    });

  });

  server.listen(that.listenPort, function() {
    that.LOG&&that.LOG('SSL terminator started',
      '\n\tListening on port', that.listenPort,
      '\n\tForwarding to', that.forwardHost + ':' + that.forwardPort);
    callback();
  });

  server.on('clientError', function(err) {
    that.ERROR&&that.ERROR('\n', 'clientError', err);
  });
};

