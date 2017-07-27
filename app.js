/**
 * Main app module
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const { randomBytes } = require('crypto');

const debug = require('util').debuglog('app');
const routes = require('./routes');

const secret = randomBytes(Math.ceil(32 / 2))
  .toString('hex')
  .slice(0, 32);

const app = express();

app.set('secret', secret);

// view engine setup
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(secret));

app.use(session({
  key: 'ot_embed_demo_sid',
  secret: secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 600000
  }
}));

app.use((req, res, next) => {
  // Add method for adding static assets
  res.locals.assets = {
    // JavaScripts. Relative to `./static/js`
    scripts: [],
    // CSS. Relative to `./static/css`
    styles: ['ui.css']
  }
  // Add empty user object for views
  res.locals.user = false;
  next();
});

app.use((req, res, next) => {
  if (req.signedCookies.ot_embed_demo_sid && !req.session.user) {
    res.clearCookie('ot_embed_demo_sid');
  }
  next();
});

app.use(express.static(path.join(__dirname, 'static')));
app.use('/', routes);

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
