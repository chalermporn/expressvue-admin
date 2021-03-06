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

var jsonfile = require('jsonfile');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var express = require('express');
var io = require("socket.io");
var debug = require('debug')('expressvue:server');
var http = require('http');


// Setup webpack middleware and config
var webpack = require("webpack");
var webpack_middleware = require("webpack-dev-middleware");
var webpack_config = require("./webpack.config.js");
var compiler = webpack(webpack_config);
var wpmw_config = {
    // all options optional

    noInfo: false,
    // display no info to console (only warnings and errors)

    quiet: false,
    // display nothing to the console

    lazy: false,
    // switch into lazy mode
    // that means no watching, but recompilation on every request

    watchOptions: {
        aggregateTimeout: 300,
        poll: true
    },
    // watch options (only lazy: false)

    publicPath: "/public/",
    // public path to bind the middleware to
    // use the same as in webpack

    headers: { "X-Custom-Header": "yes" },
    // custom headers

    stats: {
        colors: true
    }
    // options for formating the statistics
}

// Routes
var routes = require('./routes/index');
var config_routes = require("./routes/config");
var services_routes = require("./routes/services");


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(webpack_middleware(compiler, wpmw_config));

var site_config = jsonfile.readFileSync("./config/site_config.json")
var port = normalizePort(process.env.PORT || site_config.server.port || "3000");
app.set('port', port);


var server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
var io = io(server)


// Setup Routes
var config = require('./config/app_config');
config.io = io
var autobackend = require("autobackend")(config);
app.use('/', routes);
app.use('/', autobackend.factory());
app.use('/todos', autobackend.collection("todos"));
app.use('/config', autobackend.middleware.verify, config_routes);
app.use('/services', autobackend.middleware.verify, services_routes);
app.use('/messages', autobackend.middleware.verify, autobackend.collection("messages"));



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  console.log(err);
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
