# OpenTok Video Embed Demo Tutorial

This tutorial will walk you through the steps of building a simple application that uses [OpenTok Video Embeds](https://tokbox.com/developer/embeds/) to generate dynamic chat rooms for meetings between a doctor and a patient.

## Overview

OpenTok video embeds are simple embeddable widgets that can be added to web pages to get ready-made video conference with upto 3 participants. Video Embeds can generate dynamic rooms by changing a single URL parameter. This makes it ideal for simple use cases without requiring too much programming.

This demo does not require using any of OpenTok SDK. It only requires code snippets of OpenTok video embeds. The application is just a proof-of-concept to demonstrate that video embeds can be used for interesting purposes.

This tutorial will cover:

1. [Workflow](#workflow)
2. [Requirements](#requirements)
3. [Setting up development environment and dependencies](#setting-up-development-enviroment-and-dependencies)
4. [Creating a simple in-memory data store](#creating-a-simple-in-memory-data-store)
5. [Setting up ExpressJS app](#setting-up-expressjs-app)
6. [Setting up routes](#setting-up-routes)
7. [Creating user dashboards](#creating-user-dashboards)
8. [Creating and booking meetings](#creating-and-booking-meetings)
9. [Generating dynamic rooms using Video Embeds](#generating-dynamic-rooms-using-video-embeds)
10. [Creating script for launching server](#creating-script-for-launching-server)
11. [Next steps](#next-steps)

## Workflow

This tutorial is modelled after a basic telehealth use case, with patients meeeting doctors online. The same overall method can be applied to other one-to-one use cases, like tutor:student or agent:customer.

To keep things simple, this tutorial will assume there is only one doctor and one patient and not build any user authentication system. Here is the workflow we will build in this tutorial

### Doctor workflow

- Enter as Doctor
- Creates meetings for the times when they are available
- Doctor's dashboard shows upcoming meeetings
- When a meeting is about to start, it will show up as "Current Meeting"
- Doctor can click on corresponding meeting link to join the meeting.
- Once on the meeting page, doctor clicks "Start Call" button to join.
- Once call duration is over, page reloads mentioning meeting is over.

### Patient workflow

- Enter as Patient
- Searches for available appointment slots and books the one that they want.
- Patient's dashboard shows upcoming meeetings
- When a meeting is about to start, it will show up as "Current Meeting"
- Patient can click on corresponding meeting link to join the meeting.
- Once on the meeting page, patient clicks "Start Call" button to join.
- Once call duration is over, page reloads mentioning meeting is over.

## Requirements

To complete this tutorial, you will need:

- [NodeJS v6.9+](https://nodejs.org) - We use NodeJS for this example. Make sure you have NodeJS installed and `node` and `npm` binaries are on `PATH`.
- An [OpenTok Video Embed](https://tokbox.com/developer/embeds/) code - Follow the instructions on the OpenTok Video Embed page to create a Video Embed and copy the generated code. We'll need this once we have launched the application.
- A text editor.

The application server uses [ExpressJS](http://expressjs.com/) framework to create routes and serve views written in [ejs](http://ejs.co/) templating language. The page for creating meeting uses [Flatpickr](https://chmln.github.io/flatpickr/) to handle date-time input.

## Setting up development enviroment and dependencies

This project will use a directory structure like this:

```
/bin/ - Scripts to launch the application
/routes/ - Handles application URL routes
/static/ - Mounted statically on web root
  - css/ - Contains CSS files
  - js/ - Contains JavaScript files for frontend
/views/ - Contains views served by routes.
```

Create a new directory called "opentok-video-embed-demo" and create the directory structure shown above in it. We'll use this directory as our project root going ahead.

```sh
$ mkdir -p opentok-video-embed-demo/{bin,routes,static,views}
$ cd opentok-video-embed-demo
$ mkdir -p static/{css,js}
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

[Download Flatpickr](https://github.com/chmln/flatpickr/archive/v3.0.7.zip), extract the zip file and copy the following files over:
 - copy `dist/flatpickr.min.js` to `./static/js/flatpickr.min.js`
 - copy `dist/flatpickr.min.css` to `./static/css/flatpickr.min.css`

Now we are all set to start writing some code.

## Creating a simple in-memory data store

Each meeting entry will use this data structure:

```js
{
  id: number, // Auto-incremented ID of the meeting, used as unique key when joining meetings
  start_time: Date, // Start time of the meeting
  end_time: Date, // End time of the meeting
  booked: false // Set to `true` if patient has booked this meeeting
}
```

Create a file called `db.js` in the project root. This file will hold a simple data structure that we will use to store application data in memory.

Add the following code to the file:

```js
// This is our simple DB in memory. A real-world use case would use an actual database.
let DB = {

  // Used to store an array of meetings created by Doctor
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
    console.log(err);
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
  <h1>Set up OpenTok embed code</h1>

  <p>Create and paste an <a href="https://tokbox.com/developer/embeds" target="_blank">OpenTok video chat embed</a> code.</p>

  <form method="POST">

    <div>
      <textarea id="embed_code_value" name="embed_code_value" rows="10" cols="20"
        required autofocus><%= data %></textarea>
    </div>

    <div>
      <input type="submit" value="Set up">
      <a href="/">Cancel</a>
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
    <h1>Doctor Dashboard</h1>
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

### Patient's dashboard

Template logic and layout for Patient's dashboard is quite similar to Doctor's dashboard. The only difference is that Patient is asked to book a meeting if they don't have any meeting booked and Patient is only shown meetings that Patient has booked.

Create file `views/dashboard_patient.ejs` and add this content:

```html
<!doctype html>
<html>
<head>
  <title>Patient's dashboard</title>
</head>

<body>
  <div>
    <h1>Patient Dashboard</h1>
    <a href="/meetings/book">+ Book meeting slot</a>
  </div>

  <% if (meetings.current.length > 0) { %>
  <h3>Current meeting</h3>
  <div>
    <% for (var m of meetings.current) { %>
      <div>
        <time><%= m.start_time %><time> -
        <a href="/meetings/join/<%= m.id %>">Join meeting</a>
      </div>
    <% } %>
  </div>
  <% } %>

  <h2>Upcoming meetings</h2>

  <% if (meetings.upcoming.length > 0) { %>
    <div>
      <% for (var m of meetings.upcoming) { %>
        <div>
          <time><%= m.start_time %></time>
        </div>
      <% } %>
    </div>
  <% } else { %>

  <p>You don't have any upcoming meetings. You can <a href="/meetings/book">book a meeting</a>.</p>

  <% } %>

</body>
</html>
```

## Creating and booking meetings

The meetings route handles creating and booking meetings. Create file `routes/meetings_route.js` and add this code to serve the view for create meeting:

```js
const router = require('express').Router();

/**
 * View for creating meeting
 */
router.get('/create', (req, res) => {
  res.render('create_meeting');
});
```

Next, add route to serve view for booking meeting:

```js
/**
 * Render page for booking appointments
 */
router.get('/book', (req, res) => {
  // Load only meetings with future data that haven't been booked yet
  let m_list = DB.meetings_filter(false);
  res.render('book_meeting', { meetings: [].concat(m_list.current, m_list.upcoming) });
});
```

Next, add logic for handling create meeting form:

```js
/**
 * Handle POST request to create new meeeting for doctor
 */
router.post('/create', (req, res) => {
  // Create a `Date` object from the `start_date` input
  const start_time = new Date(req.body.start_date);
  // Create a `Date` object by calculating `start_date` + `duration` specified by user
  const end_time = new Date(start_time.getTime() + (parseInt(req.body.duration) * 60000));
  // Create meeting object that we will put in DB
  const m = {
    id: DB.meetings.length + 1, // Auto increment ID
    start_time: start_time,
    end_time: end_time,
    booked: false
  };
  // Put the meeting object in DB
  DB.meetings_put(m);
  // Redirect to doctor's dashboard
  res.redirect('/dashboard/doctor')
});
```

Then, add logic for handling book meeting form:

```js
/**
 * Handle form for booking appointment for patient
 */
router.post('/book', (req, res, next) => {
  // Retrieve meeting by meeting_id
  let m = DB.meetings_get(parseInt(req.body.meeting_id));
  // If meeting_id is not found, return 404
  if (m == null) {
    next();
    return;
  };
  // Else mark meeting as booked
  m.booked = true;
  // And save it
  DB.meetings_put(m);
  // Redirect to patient's dashboard
  res.redirect('/dashboard/patient');
});
```

Finally, export the `router` object:

```js
module.exports = router;
```

`routes/meetings_route.js` should now have necessary routes for displaying and processing forms for creating meetings and booking meetings. Let's create the two views required for these.

### View for creating meeting

Create file `views/create_meeting.ejs` with the following content:

```html
<!doctype html>
<html>
<head>
  <title>Create meeting slot</title>
  <link rel="stylesheet" type="text/css" href="/css/flatpickr.min.css">
</head>

<body>
  <h1>Create meeting slot</h1>

  <p>Meeting slots that you create here can be booked by patients.</p>

  <form method="POST">

    <div>
      <label for="field-start_date">Start date and time</label>
      <input id="field-start_date" type="date" class="start_date_input" autocomplete="off" name="start_date" maxlength="64" autofocus required>
    </div>

    <div>
      <label for="field-duration">Duration (minutes)</label>
      <input id="field-duration" type="number" autocomplete="off" name="duration" maxlength="2" required value="15">
    </div>

    <div>
      <input type="submit" value="Create">
      <a href="/dashboard/doctor">Cancel</a>
    </div>

  </form>
  <script src="/js/flatpickr.min.js"></script>
  <script src="/js/scheduling_ui.js"></script>
</body>
</html>
```

We need to create the script for scheduling UI. Create file `./static/js/scheduling_ui.js` with the following content to activate `flatpickr` on the input field:

```js
/* global flatpickr */

window.addEventListener('load', function () {
  flatpickr('.start_date_input', {
    // Enable date+time input
    enableTime: true,
    // Set default date in input to 5 minutes in future
    defaultDate: new Date(Date.now() + 300000),
    // Set minimum date in input to 1 minute in future
    minDate: new Date(Date.now() + 60000)
  });
});
```

### View for booking meeting

This view for booking meeting will contain a list of available upcoming meetings. Each meeting entry will have a `<form>` with the meeting `id` as a hidden field. This meeting `id` is then used the `POST` handler route for booking meetings to update the meeting with `booked: true`:

Create file `views/book_meeting.ejs` and add this content

```html
<!doctype html>
<html>
<head>
  <title>Book meeting slot</title>
</head>

<body>
  <h1>Book meeting slots</h1>

  <% for (var m of meetings) { %>
    <div>
      <time><%= m.start_time %></time> -
      <form method="POST">
        <input type="hidden" name="meeting_id" value="<%= m.id %>">
        <input type="submit" value="Book">
      </form>
    </div>
  <% } %>

  <% if (meetings.length === 0) { %>
    <p>No meetings available.</p>
  <% } %>

</body>
</html>
```

## Generating dynamic rooms using Video Embeds

Now that we have the rest of the application set up, we need to serve the actual meetings. Each meeting will use the same OpenTok Video Embed, but change the value of `room` parameter in the URL of the Video Embed to a different value for each meeting. In this tutorial, we will use the meeting ID as the unique key for creating rooms. To do this, we will replace the default value of `room=DEFAULT_ROOM` with the meeting ID.

Let's create the route for meeting. Edit the `route/meetings_route.js` file that we created before and add these lines of code before the `module.exports` line:

```js
// Our meeting URLs will be in the form of `/meetings/join/:meeting_id`

/**
 * View for joining meeting
 */
router.get('/join/:meeting_id', (req, res, next) => {
  // Get meeting details from DB
  const m = DB.meetings_get(parseInt(req.params.meeting_id));

  // If meeting does not exist of meeting is not booked, send 404
  if (m == null || !m.booked) {
    next();
    return;
  }

  // This is the key area where we create custom rooms using the same embed code.
  // We do a simple string replace.
  const embed_code = DB.embed_code.replace('DEFAULT_ROOM', `meeting${m.id}`);

  // We redirect to URL to set up embed code if embed code is not set up
  if (!embed_code) {
    res.redirect('/setup');
    return;
  }

  // Then, we figure out whether meeting is already over and bind it as
  // a boolean property for the view
  if (Date.parse(m.end_time) < Date.now()) {
    res.locals.meeting_over = true;
  } else {
    res.locals.meeting_over = false;
  }

  // Finally, we render the view by passing it the embed_code and meetingg details
  res.render('meeting', { embed_code: embed_code, meeting: m });
});
```

### View for joining meetings

Create `views/meeting.ejs` with the following content:

```html
<!doctype html>
<head>
  <title>Meeting <%= meeting.id %></title>
</head>
<body>

  <% if (!meeting_over) { %>
  <h1>Meeting</h1>
  <div>
    <div>Start: <time><%= meeting.start_time %></time></div>
    <div id="message"></div>
  </div>

  <div id="ot_embed_demo_container"><%- embed_code %></div>
  <p><a href="/">Exit</a></p>

  <script>
    window.addEventListener('load', function () {
      var message_container = document.getElementById('message');
      var end_time = Date.parse("<%= meeting.end_time %>");
      var time_left = end_time - Date.now();

      var update_time_remaining = function () {
        var remaining = Math.round((end_time - Date.now()) / 60000);
        message_container.innerHTML = '<p><strong>Time left: ' + remaining + ' minute(s).</strong></p>';
      };

      update_time_remaining();
      setInterval(update_time_remaining, 60000);

      setTimeout(function () {
        window.location.reload();
      }, time_left);
    });
  </script>

  <% } else { %>
    <p><strong>Meeting is over.</strong></p>
    <p><a href="/" class="button">Exit</a></p>
  <% } %>

</body>
</html>
```

This view loads the embed code only if meeting is not over. This results in the embed code showing up as a video chat widget when the page is loaded. If meeting is over, it prints a message saying "Meeting is over".

The `<script>` section of the view prints a message using `setInterval` every minute showing how many minutes are left in the meeting. It also sets a timer using `setTimeout` which force reloads the page once the meeting time is over. Since the route pre-checks if meeting is over, such a reload will result in showing the "Meeting is over" message.

Now, the only thing left is to bootstrap our `app` and launch a HTTP server.

## Creating script for launching server

Create file `./bin/www` and add this content:

```js
#!/usr/bin/env node

/**
 * Bootstraps and launches app listening on specified HTTP port
 */

const app = require('../app');
const http = require('http');

/**
 * Get port from environment and store in Express.
 */

const port = process.env.PORT || '3000';
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

server.listen(port);
server.on('listening', () => {
  console.log('Listening on port ' + port);
});
```

This will load ExpressJS `app` instance exported from `app.js` and launch it using a HTTP server. By default, it uses port `3000`, but it can be modified by specifying `PORT` environment variable.

### Launch the application

Now, you can launch the application from the project root. Run:

```sh
$ node ./bin/www
```

Open the browser and point to http://localhost:3000.

To run on a different port, say `8080`, run:

```sh
$ PORT=8080 node ./bin/www
```

## Next steps

Now that the application is running, go the "Setup" page and paste in the video embed code obtained from OpenTok. Then, play around by creating a few appointments by entering in as doctor and then booking them by entering as patient (maybe, in another tab).

Notes:

- This tutorial did not configure SSL. WebRTC requires pages to be served over HTTPS with the exception of `http://localhost`. To set up a reverse proxy with SSL termination, see [nginx as a reverse proxy with SSL termination](https://www.sitepoint.com/configuring-nginx-ssl-node-js/).
- This tutorial also simplified code to a large extent. You may want to add styles or better UI/UX by improving on the basic code given here.
- OpenTok Video Embeds have their limitations. If they do not solve your use case, you should try doing a deeper integration using OpenTok SDKs. See [TokBox Developer Portal](https://tokbox.com/developer) for details.
