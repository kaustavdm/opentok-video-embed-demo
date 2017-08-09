# OpenTok Video Embed Demo Tutorial

This tutorial will walk you through the steps of building a simple application that uses [OpenTok Video Embeds](https://tokbox.com/developer/embeds/) to generate dynamic chat rooms for meetings between a doctor and a patient.

## Overview

OpenTok video embeds are simple embeddable widgets that can be added to web pages to get ready-made video conference with upto 3 participants. Video Embeds can generate dynamic rooms by changing a single URL parameter. This makes it ideal for simple use cases without requiring too much programming.

This demo does not require using any of OpenTok SDK. It only requires code snippets of OpenTok video embeds. The application is just a proof-of-concept to demonstrate that video embeds can be used for interesting purposes.

This tutorial will cover:

1. [Requirements](#requirements)
2. [Setting up development environment and dependencies](#setting-up-development-enviroment-and-dependencies)
3. [Creating a simple in-memory data store](#creating-a-simple-in-memory-data-store)
4. [Setting up ExpressJS app](#setting-up-expressjs-app)
5. Setting up routes
6. Creating route and view for meetings
7. Generating dynamic rooms using Video Embeds
8. Creating script for launching server

## Requirements

To complete this tutorial, you will need:

- [NodeJS v6.9+](https://nodejs.org) - We use NodeJS for this example. Make sure you have NodeJS installed and `node` and `npm` binaries are on `PATH`.
- An [OpenTok Video Embed](https://tokbox.com/developer/embeds/) code - Follow the instructions on the OpenTok Video Embed page to create a Video Embed and copy the generated code. We'll need this once we have launched the application.
- A text editor.

The application server uses [ExpressJS](http://expressjs.com/) framework to create routes and serve views written in [ejs](http://ejs.co/) templating language.

## Setting up development enviroment and dependencies

This project will use a directory structure like this:

```
/bin/ - Scripts to launch the application
/routes/ - Handles application URL routes
/static/ - Mounted statically on web root
/views/ - Contains views served by routes.
```

Create a new directory called "opentok-video-embed-demo" and create the directory structure shown above in it. We'll use this directory as our project root going ahead.

```sh
$ mkdir -p opentok-video-embed-demo/{bin,routes,static,views}
$ cd opentok-video-embed-demo
```

Next, initiate a `npm` project. This will create a `package.json` file with default values:

```sh
$ npm init -y
```

Edit the generated `package.json` file to tweak the `name`, `version` and `description` fields as needed.

Then, install the required NodeJS module dependencies:

```sh
$ npm install --save express ejs express-session body-parser cookie-parser
```

Now we are all set to start writing some code.

## Creating a simple in-memory data store

Create a file called `db.js` in the project root. This file will hold a simple data structure that we will use to store application data in memory.

Add the following code to the file:

```js
// This is our simple DB in memory. A real-world use case would use an actual database.
let DB = {

  // Used to store meeting information
  meetings: [],

  // Used to store embed code
  embed_code: ""
};
```

Add a few convenience methods to `db.js` to make it easier to query the `DB` object:

```js
/**
 * Find a meeting by its id
 */
DB.meetings_get = function (id) {
  // Return `null` if meeting id is not found, else return the meeting object
  return this.meetings.find(m => m.id === id) || null;
}

/**
 * Add/Update a meeting entry
 */
DB.meetings_put = function (new_meeting) {
  const key = this.meetings.findIndex(m => m.id === new_meeting.id);
  if (key < 0) {
    this.meetings.push(new_meeting);
  } else {
    this.meetings[key] = new_meeting;
  }
}
```

Then, add this code to `db.js` to export the `DB` object:

```js
module.exports = DB;
```

We'll a few more methods to `db.js` later on to sort and filter entries. Let's set up an ExpressJS app before that.

## Setting up ExpressJS app

Create a file called `app.js` in the project root. This file will create, set up and export an ExpressJS app instance.

Start by adding this code to `app.js`:

```js
/**
 * Main app module
 */

// Load dependencies
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// Create a nice little replacement for `console.log`
const debug = require('util').debuglog('app');

// Expose in-memory DB as `global`.
global.DB = require('./db');

// Initiate express application
const app = express();

// view engine setup
app.set('view engine', 'ejs');
```

Add code to enable `body-parser` middleware to parse HTTP request body data. We need this to process form data. In `app.js`, add these lines:

```js
// Set up body-parser to parse request body. Used for form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
```

Next, add middleware to programmatically load UI scripts and stylesheets in views, and set an ExpressJS response property to pass user data to views:

```js
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
```

Once these are done, add routes for express. First, mount the `./static/` directory on web root and then load the `./routes/` module (details on `./routes` module in the next section):

```js
// Mount routes
app.use(express.static(path.join(__dirname, 'static')));
app.use('/', require('./routes'));
```

Finally, add a catchall middleware to trap errors in routes and export the `app` instance:

```js
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

// Export `app`
module.exports = app;
```
