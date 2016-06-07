/**
 * Module dependencies.
 */
var debug = require('debug')('RemotePlayer:server'),
    http = require('http'),
    config = require('./bin/config'),
    mongoose = require('mongoose'),
    hub = require('./bin/hub'),
    secret_key = 'secret_key';

// mongo connection
var mongoUrl = //"mongodb://localhost/remote";
    !config.mongodb.user && !config.mongodb.password
        ? "mongodb://localhost/" + config.mongodb.database
        : "mongodb://" + config.mongodb.user + ":" + config.mongodb.password + "@" + config.mongodb.host + ":" + config.mongodb.port + "/" + config.mongodb.database;

mongoose.connect(mongoUrl);

/**
 * Get port from environment and store in Express.
 */
var port = normalizePort(process.env.PORT || '3000');

/**
 * Create HTTP server.
 */
var server = http.createServer(handler);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

hub.init(server);

function handler (req, res) {
  res.writeHead(500);
  return res.end('Error loading index.html');
}

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}