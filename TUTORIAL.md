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
5. [Setting up routes](#setting-up-routes)
6. [Creating user dashboards](#creating-user-dashboards)
6. Creating and joining meetings
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

Next, add middleware to ExpressJS `response` object property to pass user data to views:

```js
// Set up middleware
app.use((req, res, next) => {
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

## Setting up routes

We'll build the `./routes/` directory as a module to separate individual HTTP route segments in different files.

Create file `routes/index.js`. This file exports the route that is loaded and mounted in `app.js`. It also loads other routes in the same directory and mounts them as sub-routes. Each of these routes are instances of [Express Router](http://expressjs.com/en/4x/api.html#router).

Add this in `routes/index.js`:

```js
// File: routes/index.js

const router = require('express').Router();

// Serve `home` view. This renders `views/home.ejs`
router.get('/', (req, res) => {
  res.render('home');
});

// Load other routes and mount them
router.use('/setup', require('./setup_route'));
router.use('/dashboard', require('./dashboard_route'));
router.use('/meetings', require('./meetings_route'));

module.exports = router;
```

This loads 3 other files in the `routes/` directory - `setup_route.js`, `dashboard_route.js` and `meetings_route.js`.

### Homepage view

Let's create our first view - a rather simple view for the homepage. This view will only contain links to enter dashboards for doctor and patient, and a link to set up video embed code.

Create file `views/home.ejs`. EJS templates use `.ejs` file extension by default. Add this HTML to `views/home.ejs`

```html
<!doctype html>
<html>
<head>
  <title>OpenTok Video Embed demo</title>
</head>

<body>
  <div>
    <a href="dashboard/doctor">Enter as Doctor</a>
  </div>

  <div>
    <a href="dashboard/patient">Enter as Patient</a>
  </div>

  <div>
    <a href="/setup">Setup/Update embed code</a>
  </div>
</body>
</html>
```

### Routes for adding OpenTok Video Embed code

Create file `routes/setup_route.js`. This file manages routes for a form that saves OpenTok Video Embed code in the in-memory database.

```js
const router = require('express').Router();

// Serve the view `setup.ejs` for embed code setup form
router.get('/', (req, res) => {
  // We pass current embed code as `data` as property to the view
  res.render('setup', { data: DB.embed_code || "" });
});

// Handle POST data from the form in the view.
// We only set the `embed_code` property in `DB` and redirect to homepage.
router.post('/', (req, res) => {
  DB.embed_code = req.body.embed_code_value.trim();
  res.redirect('/');
});

// Export the router
module.exports = router;
```

Create the view file for this route: `views/setup.ejs`. Add this HTML content to the file:

```html
<!doctype html>
<html>
<head>
  <title>Set up OpenTok Video embed code</title>
</head>

<body>
  <h2>Set up OpenTok embed code</h2>

  <p>Create and paste an <a href="https://tokbox.com/developer/embeds" target="_blank">OpenTok video chat embed</a> code.</p>

  <form method="POST">

    <div>
      <textarea id="embed_code_value" name="embed_code_value" rows="10" cols="20"
        required autofocus><%= data %></textarea>
    </div>

    <div class="buttons">
      <input type="submit" value="Set up">
      <a href="/" class="button secondary">Cancel</a>
    </div>

  </form>
</body>
</html>
```

## Creating user dashboards

The dashboard route manages routes for both patients' and doctors' dashboards. Create file `routes/dashboard_route.js` and add this code in it:

```js
const router = require('express').Router();

/**
 * Doctor's dashboard
 */
router.get('/doctor', (req, res) => {
  res.locals.user = { role: 'Doctor' };
  // Render view with meetings that have a future end time
  res.render('dashboard_doctor', { meetings: DB.meetings_filter() })
});

/**
 * Patient's dashboard
 */
router.get('/patient', (req, res) => {
  res.locals.user = { role: 'Patient' };
  // Render view only with meetings that were booked and have future end time
  res.render('dashboard_patient', { meetings: DB.meetings_filter(true) });
});

module.exports = router;
```

### `DB.meetings_filter()` method

Notice the use of `DB.meetings_filter()` method in the previous example. We need a method to filter existing meetings in the database so that we can keep our router code DRY. We hadn't created it earlier, so let's add it now. Edit `db.js` and add this method before the line with `module.exports`:

```js
// db.js

// Sort a given array of meetings by their start time in ascending order.
// When using an actual database, you would use the database's ordering methods
let sort = m_list => {
  return m_list.sort(function (a, b) {
    return a.start_time > b.start_time;
  });
}

/**
 * Filters through given list of meetings and split it into upcoming and current meetings based on time.
 *
 * @param {null|boolean} is_booked - If `null` or `undefined`, filter on all items in `mlist`. If true, filter only on
 * meetings that are booked. If false, filter only on meetings that have not been booked.
 * @return {object} Object containing `upcoming` and `current` meetings
 */
DB.meetings_filter = function (is_booked=null) {
  const currtime = Date.now();
  let mlist;

  if (is_booked != null) {
    if (is_booked) {
      mlist = () => this.meetings.filter(m => m.booked);
    } else {
      mlist = () => this.meetings.filter(m => !m.booked);
    }
  } else {
    mlist = () => this.meetings;
  }

  return {
    // Starting after 5 minutes
    upcoming: sort(mlist().filter(i => i.start_time.getTime() >= currtime + 300000 )),
    // Starting in 5 minutes or has already started but not ended
    current: sort(mlist().filter(i => i.start_time.getTime() < currtime + 300000 && i.end_time.getTime() >= currtime))
  }
};
```

### Doctor's dashboard

The doctor's dashboard shows upcoming meeetings for the doctor - both that patient has booked and not booked.

Create file `views/dashboard_doctor.ejs` and add this section of code in it:

```html
<!doctype html>
<html>
<head>
  <title>Doctor's dashboard</title>
</head>

<body>
  <div>
    <h2>Doctor Dashboard</h2>
    <a href="/meetings/create">+ Add meeting slot</a>
  </div>
```

Notice that the code above has a link for Doctor to create meeting page. We'll create that in a while.

Next, show current meeting(s) in the view. This code uses EJS conditionals. EJS conditionals are written as regular JavaScript inside EJS tags `<%` and `>`. Append this code to `views/dashboard_doctor.ejs`:

```html
<% if (meetings.current.length > 0) { %>
<h3>Current meeting</h3>
<div>
  <% for (var m of meetings.current) { %>
    <% if (m.booked) { %>
      <div>
        <time><%= m.start_time %></time> -
        <a href="/meetings/join/<%= m.id %>">Join meeting</a>
      </div>
    <% } else { %>
      <div>
        <time><%= m.start_time %></time> -
        <span>Unclaimed</span>
      </div>
    <% } %>
  <% } %>
</div>
<% } %>
```

This block of code shows up only if there is a current meeting: `meetings.current.length > 0`. If there is any, it iterates over the `meetings.current` array, which was passed from the `/dashboard/doctor` route. For each meeting entry in that array, it shows a "Join meeting" link if the meeting entry has been booked. Else, it shows meeting as "Unclaimed". The URL to a meeting is created using the meeting `id`.

Next, we'll show upcoming meetings - meetings that don't start in 5 minutes. The template logic is similar to current meeting, except if there are no upcoming meetings, we show a link to create a meeting. Append this final piece of code to `views/dashboard_doctor.ejs`:

```html
<h3>Upcoming meetings</h3>

<% if (meetings.upcoming.length > 0) { %>
  <div>
    <% for (var m of meetings.upcoming) { %>
      <% if (m.booked) { %>
        <div>
          <time><%= m.start_time %></time> -
          <span>Booked</span>
        </div>
      <% } else { %>
        <div>
          <time><%= m.start_time %><time> -
          <span>Unclaimed</span>
        </div>
      <% } %>
    <% } %>
  </div>

<% } else { %>

  <p>You don't have any upcoming meetings. You can <a href="/meetings/create">create a meeting</a>.</p>

<% } %>

</body>
</html>
```
