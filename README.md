# OpenTok Embed Appointment Demo

A demo application that uses [OpenTok Video Embeds](https://tokbox.com/developer/embeds/) for appointments.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/opentok/opentok-video-embed-demo/tree/master)

# Table of Contents

- [Overview](#overview)
- [Tutorial](#tutorial)
- [Install](#install)
- [Walkthrough](#walkthrough)
  - [Workflow](#workflow)
  - [Tech dependencies](#tech-dependencies)
  - [Initializing application](#initializing-application)
  - [Data store](#data-store)
  - [Setup ExpressJS app](#setup-expressjs-app)
  - [Setup routes](#setup-routes)
  - [Meetings](#meetings)
    - [Generate dynamic rooms using embed](#generate-dynamic-rooms-using-embed)
  - [Server startup script](#server-startup-script)

# Overview

OpenTok Video Chat Embeds are embeddable widgets that can be added to web pages using iFrames or JavaScript. The video embeds can power a video chat conference for up to 3 participants along with support for dynamic rooms. This makes it ideal for getting started without requiring an OpenTok SDK.

This demo application demonstrates the use of dynamic embed rooms along with scheduled meetings between a "doctor" and a "patient". However, this can be applied to any 1:1 scenario such as "teacher":"student" and "representative":"client".

# Tutorial

**See [TUTORIAL.md](TUTORIAL.md) for a step-by-step tutorial on building the application.**

# Install

**See [INSTALL.md](INSTALL.md) for installation instruction and first time setup.**

---

# Walkthrough

This is a step-by-step walkthrough of building the demo embed application, highlighting the key pieces.

## Dependencies

- Application backend: [NodeJS 6.9+](http://nodejs.org)
    - Routing framework: [ExpressJS](http://expressjs.com/)
    - View engine: [ejs](http://ejs.co/)

## Initializing application

First up, install NodeJS and `npm`.

Once all of these are ready, create a directory and initiate a `npm` project:

```sh
$ mkdir -p opentok-video-embed-demo/{bin,routes,static,views}
$ cd opentok-video-embed-demo
$ npm init -y
```

This will create the directory structure we will use for the project and initiate a `package.json` file in the current directory with default values. Edit this file to tweak the `version` and `description` fields as needed.

Then, install the required NodeJS module dependencies:

```sh
$ npm install --save express ejs express-session body-parser cookie-parser
```

**Note:** The rest of the tutorial contains relevant code sections for each file. For full code, go through the entire file in the repository.

## Data store

This demo stores everything in memory to keep things simple. The [`db.js`](db.js) script exports an object, `DB`, which stores meetings and embed code and gives few useful methods to query the `meetings` array.

[`app.js`](app.js) adds the `DB` object to `global` scope so that the rest of the application can access it.

This how how `DB` looks like:

```js
// This is our simple DB in memory. A real-world use case would use an actual database.
let DB = {

  // Used to store meeting information
  meetings: [],

  // Used to store embed code
  embed_code: ""
};
```

Each meeting entry in `DB.meetings[]` is an object:

```js
{
  id: integer,
  start_time: Date,
  end_time: Date,
  booked: false
}
```

When a patient books a meeting the `booked` property is set to `true`. Ex:

```
{
  id: 3,
  start_time: 2017-08-04T13:51:00.000Z,
  end_time: 2017-08-04T14:06:00.000Z,
  booked: false
}
```

`DB` also exposes a few utility methods to query and update the `DB.meetings[]` array. See [`db.js`](db.js) for the code.

## Setup ExpressJS app

The script [`./app.js`](app.js) creates, mounts, and exports an ExpressJS app instance.

```js
const express = require('express');
const bodyParser = require('body-parser');

// Create express instance
const app = express();
```

Set view engine and middleware parsers:

```js
// view engine setup
app.set('view engine', 'ejs');

// parse data in request body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
```

Mount routes:

```js
// Mount the `./static` directory as a static file server
app.use(express.static(path.join(__dirname, 'static')));
// Mount the `./routes` module
app.use('/', require('./routes'));
```

Export the `app` instance:

```js
module.exports = app
```

[`app.js`](app.js) also mounts a few other utility middleware. Take a look at the file for details.

## Setup routes

The [`./routes/`](routes) directory is built as a module to separate individual HTTP route segments in different files. [`routes/index.js`](routes/index.js) loads relevant routes from the same directory and mounts them on the exported route, which `app.js` mounts at `/` (root).

**`routes/index.js`**:

```js
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

### Dashboard routes

There are two dashboards in the demo, one for doctors and another for patients. They are almost identical with slight differences.

Patient dashboard shows meetings that the patient has booked and links to the page for booking available meeting slots. Doctor dashboard shows upcoming appointments that the doctor has created, including the ones which haven't been booked already by any patient. There is also a link to create new meeting slots. Both of the dashboards highlight current meeting with a link to join the meeting.

The [`./routes/dashboard_route.js`](routes/dashboard_route.js) contains the logic for querying `DB` and rendering both dashboards.

Doctor dashboard renders the view at [`./views/dashboard_doctor.ejs`](views/dashboard_doctor.ejs). This is how the doctor dashboard (`/dashboard/doctor/`) renders its view:

```js
/**
 * Doctor's dashboard
 */
router.get('/doctor', (req, res) => {
  res.locals.user = { role: 'Doctor' };
  res.render('dashboard_doctor', { meetings: DB.meetings_filter() })
});
```

The patient dashboard is served at `/dashboard/patient` and its view is in [`./views/dashboard_patient.ejs`](views/dashboard_patient.ejs). This is how the patient dashboard (`/dashboard/patient`) renders its view:

```js
/**
 * Patient's dashboard
 */
router.get('/patient', (req, res) => {
  res.locals.user = { role: 'Patient' };
  // Render view only with meetings that were booked
  res.render('dashboard_patient', { meetings: DB.meetings_filter(true) });
});
```

## Meetings

[`./routes/meeting_route.js`](routes/meeting_route.js) handles route for creating, booking and joining meetings. Doctors can create meetings, patients can book available meetings and either can join a meeting that has been booked.

### Generate dynamic rooms using embed

The route for joining meetings (`/meetings/join/:meeting_id`) loads meeting details, fetches embed code and passes these to the view for rendering.

**It replaces the `room` parameter's value in the embed code's URL according to the meeting id. This is how the same OpenTok video embed is used for different meetings even at the same time:**

```js
// Here `req.embed_code` contains the original embed code obtained for an
// OpenTok video embed
const embed_code = req.embed_code.replace('DEFAULT_ROOM', `meeting${meeting.id}`);
```

So, this embed code:

```html
<div id="otEmbedContainer" style="width:800px; height:640px"></div>
<script src="https://tokbox.com/embed/embed/ot-embed.js?embedId=<embedid>&room=DEFAULT_ROOM"></script>
```

becomes:

```html
<!-- Where meeting id is 42 -->
<div id="otEmbedContainer" style="width:800px; height:640px"></div>
<script src="https://tokbox.com/embed/embed/ot-embed.js?embedId=<embedid>&room=meeting42"></script>
```

The view for joining meetings is at [`./views/meeting.ejs`](views/meeting.ejs). This view simply adds the resulting embed code to the output if the meeting is not yet over.

This works for both `<iframe>` and JavaScript versions of the embed code.

## Server startup script

The script at [`./bin/www`](bin/www) lauches the application. It loads the ExpressJS `app` and launches a `HTTP` server depending on the port configuration specified

Set up the `app` and `http` instances:

```js
// Load dependencies, including `app.js` and the `models` module from project
// root
const app = require('../app');
const http = require('http');

// Get port from environment and store in Express.
const port = process.env.PORT || '3000';
app.set('port', port);

// Create HTTP server.
const server = http.createServer(app);

// Launch the server
server.listen(port);
```

Start the application server:

```js
$ node ./bin/www
```

**Note**: This demo needs to be served over HTTPS. See [INSTALL.md](INSTALL.md) for details.


## Workflow

In this application, a doctor can create time slots when they are available and the patient can book the open time slots. At the time of the appointment, patients and doctors are connected together in a meeting room using a custom name to ensure that each meeting is happening in a separate room.

### Doctor workflow

- Enter as a Doctor
- Creates meetings for the times when they are available
- Doctor's dashboard shows upcoming meetings
- Doctor can click on corresponding meeting link to join the meeting.
- The doctor can join the call by clicking the "Start Call" button.
- The page will reload once the call is over.

### Patient workflow

- Enter as a Patient
- Search and book an available appointment slot
- Patient's dashboard shows upcoming meetings
- Patient can click on corresponding meeting link to join the meeting.
- The patient can join the call by clicking the "Start Call" button.
- The page will reload once the call is over.
