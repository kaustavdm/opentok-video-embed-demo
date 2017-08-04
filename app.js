/**
 * Main app module
 */

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const debug = require('util').debuglog('app');

// Expose in-memory DB as `global`
global.DB = require('./db');

// Initiate express application
const app = express();

// view engine setup
app.set('view engine', 'ejs');

// Set up body-parser to parse request body. Used for form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up middleware
app.use((req, res, next) => {
  // Add method for adding static assets
  res.locals.assets = {
    // JavaScripts. Relative to `./static/js`
    scripts: ['ui.js'],
    // CSS. Relative to `./static/css`
    styles: ['ui.css']
  }
  // Add empty user object for views
  res.locals.user = false;
  next();
});

// Mount routes
app.use(express.static(path.join(__dirname, 'static')));
app.use('/', require('./routes'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
// no stacktraces leaked to user unless in development environment
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  if (!err.status || err.status !== 404) {
    debug(err);
  }
  res.render('error', {
    message: err.message
  });
});


module.exports = app;
