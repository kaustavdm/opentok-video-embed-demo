# OpenTok Embed Appointment Demo

<img src="https://assets.tokbox.com/img/vonage/Vonage_VideoAPI_black.svg" height="48px" alt="Tokbox is now known as Vonage" />

An appointment application that uses [OpenTok Video Embeds](https://tokbox.com/developer/embeds/) to provide real-time video communication.

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

OpenTok Video Chat Embeds are embeddable widgets that can be added to web pages using iFrames or JavaScript. You can generate rooms dynamically to allow private communication for up to three participants per room. This is ideal for getting started without using an OpenTok SDK.

This application demonstrates the use of dynamic embed rooms for appointments between a doctor and a patient. However, you can apply this concept to any 1:1 video chatting scenario such as a teacher and student or even a sales representative and a client.

## Workflow

In this application, a doctor can create time slots when they are available and the patient can book the open time slots. At the time of the appointment, patients and doctors are connected together in a meeting room using a custom name to ensure that each meeting is happening in a separate room.

# Tutorial

**See [TUTORIAL.md](TUTORIAL.md) for a step-by-step tutorial on building the application.**

# Install

**See [INSTALL.md](INSTALL.md) for installation instruction and first time setup.**

---

# Walkthrough

This step-by-step walkthrough will show you how to build this embed application while highlighting key pieces.

## Dependencies

- Application backend: [NodeJS 6.9+](http://nodejs.org)
  - Routing framework: [ExpressJS](http://expressjs.com/)
  - View engine: [ejs](http://ejs.co/)

## Initializing application

First up, install NodeJS and `npm`.

Once all of these are ready, create a directory and initiate an `npm` project:

```sh
$ mkdir -p opentok-video-embed-demo/{bin,routes,static,views}
$ cd opentok-video-embed-demo
$ npm init -y
```

This will create a directory structure and a `package.json` file. You can edit this file to change the `description`, `version`, or any other field at any time.

Now, install the required NodeJS module dependencies:

```sh
$ npm install --save express ejs express-session body-parser cookie-parser
```

**Note:** The rest of the tutorial goes over relevant code sections for each file. To see all of the code, please review each file in the repository.

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

[`app.js`](app.js) also mounts a few other utility middleware. Review the file for more details.

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

## Storing Data

This demo stores everything in memory to keep things simple. The [`db.js`](db.js) script exports an object, `DB`, which stores meetings and embed code and gives few useful methods to query the `meetings` array.

[`app.js`](app.js) adds the `DB` object to `global` scope so that the rest of the application can access it.

This how how `DB` looks like:

```js
// This is our simple DB in memory. A real-world use case would use an actual database.
let DB = {

  // Used to store meeting information
  meetings: [],

  // Used to store embed code
  embed_code: ''
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

When a patient books a meeting, the `booked` property is set to `true`. Ex:

```
{
  id: 3,
  start_time: 2017-08-04T13:51:00.000Z,
  end_time: 2017-08-04T14:06:00.000Z,
  booked: false
}
```

`DB` also contains a few utility methods to query and update the `DB.meetings[]` array. See [`db.js`](db.js) for the exact details.

### Dashboard routes

There are two nearly identical dashboards in the demo, one for doctors and another for patients.

The patient dashboard shows meetings that the patient has booked and links to the pages for booking available meeting slots. The doctor dashboard shows links to create new meetings, upcoming appointments that the doctor has created, including the ones which haven't been booked by a patient. Both of the dashboards highlight current meeting with a link to join the meeting.

The [`./routes/dashboard_route.js`](routes/dashboard_route.js) contains the logic for querying `DB` and rendering for each dashboard.

The doctor dashboard is served at `/dashboard/doctor` and its view resides in [`./views/dashboard_doctor.ejs`](views/dashboard_doctor.ejs).

```js
/**
 * Doctor's dashboard
 */
router.get('/doctor', (req, res) => {
  res.locals.user = { role: 'Doctor' };
  res.render('dashboard_doctor', {
    meetings: DB.meetings_filter()
  });
});
```

The patient dashboard is served at `/dashboard/patient` and its view is in [`./views/dashboard_patient.ejs`](views/dashboard_patient.ejs).

```js
/**
 * Patient's dashboard
 */
router.get('/patient', (req, res) => {
  res.locals.user = {
    role: 'Patient'
  };
  // Render view only with meetings that were booked
  res.render('dashboard_patient', {
    meetings: DB.meetings_filter(true)
  });
});
```

## Meetings

[`./routes/meeting_route.js`](routes/meeting_route.js) handles route for creating, booking, and joining meetings. The doctors can create meetings whereas the patients can only book available meetings.

### Generate dynamic rooms using embed

The route for joining meetings (`/meetings/join/:meeting_id`) loads meeting details, fetches the embed code, and passes these to the view for rendering.

**We replace the `room` parameter's value in the embed code's URL to the meeting_id to generate dynamic rooms:**

```js
// Here `req.embed_code` contains the original embed code obtained for an
// OpenTok video embed
const embed_code = req.embed_code.replace(
  'DEFAULT_ROOM',
  `meeting${meeting.id}`
);
```

So, this embed code:

```html
<div id="otEmbedContainer" style="width:800px; height:640px"></div>
<script src="https://tokbox.com/embed/embed/ot-embed.js?embedId=<embedid>&room=DEFAULT_ROOM"></script>
```

becomes:

```html
<!-- Where meeting_id is 42 -->
<div id="otEmbedContainer" style="width:800px; height:640px"></div>
<script src="https://tokbox.com/embed/embed/ot-embed.js?embedId=<embedid>&room=meeting42"></script>
```

The view for joining meetings resides in [`./views/meeting.ejs`](views/meeting.ejs). In the example above, we used the JavaScript embed code, however, you can choose to use an iFrame.

## Server startup script

The script at [`./bin/www`](bin/www) starts the application by loading the ExpressJS `app` and launching an `HTTP` server on the specified port.

Setting up the `app` and `http` instances:

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

**Note**: This application needs to be served over HTTPS. See [INSTALL.md](INSTALL.md) for details.

## Development and Contributing

Interested in contributing? We :heart: pull requests! See the
[Contribution](CONTRIBUTING.md) guidelines.

## Getting Help

We love to hear from you so if you have questions, comments or find a bug in the project, let us know! You can either:

- Open an issue on this repository
- See <https://support.tokbox.com/> for support options
- Tweet at us! We're [@VonageDev](https://twitter.com/VonageDev) on Twitter
- Or [join the Vonage Developer Community Slack](https://developer.nexmo.com/community/slack)

## Further Reading

- Check out the Developer Documentation at <https://tokbox.com/developer/>
