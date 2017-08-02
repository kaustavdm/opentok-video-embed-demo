# OpenTok Embed appointment demo

A small demo application demonstrating usage of [OpenTok video embeds](https://tokbox.com/developer/embeds/) in appointments.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/kaustavdm/ot_embed_appointment_demo)

# Table of Contents

- [Overview](#overview)
- [Install](#install)
- [Tutorial](#tutorial)
  - [Workflow](#workflow)
  - [Tech dependencies](#tech-dependencies)
  - [Initializing application](#initializing-application)
  - [Data model](#data-model)
  - [Server startup script](#server-startup-script)

# Overview

OpenTok video embeds are simple embeddable widgets that can be added to web pages to get ready-made video conference with upto participants. Embeds support dynamic rooms by changing a single URL parameter. This makes it ideal for using it in simple use cases without requiring too much programming. This demo is a small application that demonstrates using dynamic embed rooms along with a simple appointment flow.

This demo does not require using any of OpenTok SDKs because all it uses are code snippets for OpenTok video embeds. The application is just a proof-of-concept to demonstrate that video embeds can be used for interesting purposes.

# Install

See [INSTALL.md](INSTALL.md) for installation instruction and first time setup.

---

# Tutorial

This is a detailed, step-by-step run through of building this application.

## Workflow

This sample application is modelled after a basic telehealth use case, with patients meeeting doctors online. The same can be edited and applied to other similar 1:1 use cases, like tutor:student or agent:customer.

In this example, a doctor can create meetings for time slots when they are available. Patients can then find and book an available appointment. At the time of the appointment, patients and doctors are connected together to a meeting room. The meeting room loads an existing OpenTok embed code with a custom room name, ensuring each meeting happens in a different room.

### Doctor workflow

- Doctor logs in
- Creates meetings for the times when they are available
- Doctor's dashboard shows upcoming meeetings
- Doctor can click on corresponding meeting link to join the meeting.
- Once on the meeting page, doctor clicks "Start Call" button to join.
- Once call duration is over, page reloads mentioning meeting is over.

### Patient workflow

- Doctor logs in
- Searches for available appointment slots and books the one that they want.
- Patient's dashboard shows upcoming meeetings
- Patient can click on corresponding meeting link to join the meeting.
- Once on the meeting page, patient clicks "Start Call" button to join.
- Once call duration is over, page reloads mentioning meeting is over.

## Tech dependencies

- Database: [PostgreSQL 9.6+](https://www.postgresql.org)
- Application backend: [NodeJS 6.9+](http://nodejs.org)
    - Routing framework: [ExpressJS](http://expressjs.com/)
    - Database ORM: [Sequelize](sequelizejs.com)
    - View engine: [ejs](http://ejs.co/)

## Initializing application

First up, install NodeJS, `npm` and PostgreSQL server. You can also use a hosted PostgreSQL server. This application will only need the URI to connect to a PostgreSQL database.

Once all of these are ready, create a directory and initiate a `npm` project:

```sh
$ mkdir -p ot_embed_appointment_demo/{bin,models,routes,static,views}
$ cd ot_embed_appointment_demo
$ npm init -y
```

This will create the directory structure we will use for the project and initiate a `package.json` file in the current directory with default values. Edit this file to tweak the `version` and `description` fields as needed.

Then, install the required NodeJS module dependencies:

```sh
$ npm install --save express ejs sequelize pg pg-hstore express-session body-parser cookie-parser
```

**Note:** The rest of the tutorial contains relevant code sections for each file. For full code, go through the entire file in the repository.

## Data model

The data model used in the demo uses a user table, a doctor table, a patient table, a meeting table and a separate table to store application data. [Sequelize models](http://docs.sequelizejs.com/manual/tutorial/models-definition.html) help us to model these tables so that we can work with them from our application without directly writing SQL. The models are present as Sequelize `models` in the `./models/` directory.

This is how the models' structure look like:

### [User model](models/user.js)

Used to store user authentication information, user role and reference to either a `Doctor` or a `Patient` model, depending on the role.

`User` model definition:

```js
// Define a sequelize model named `User`
var User = sequelize.define('User', {

  // username field
  username: {
    // Type: string
    type: DataTypes.STRING,
    // Does not allow null
    allowNull: false,
    // Should be unique
    unique: true
  },

  // password field
  password: {
    // Type: string
    type: DataTypes.STRING,
    // Does not allow null
    allowNull: false,
    // Generates hash when new value is set
    set (val) {
      const salt = generateSalt();
      const hashed = sha512(val, salt);
      // Store hashed password and salt
      this.setDataValue('password', hashed);
      this.setDataValue('salt', salt);
    }
  },

  // salt field. This is set when setting the password
  salt: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // role field, can be either a 'Doctor' or a 'Patient' in this example
  role: {
    // Data type as `ENUM` lets us accept only a known list of values at
    // database level
    type: DataTypes.ENUM('Doctor', 'Patient'),
    defaultValue: 'Doctor',
    allowNull: false
  }
});
```

`User` model has associations defined to portray relationships between models. `User` maintains nullable references to `Doctor` and `Patient` model as a user can be either a "doctor" or a "patient". When we create a new `User`, we also create a corresponding `Doctor` or `Patient`.

```js
User.associate = function (models) {
  // HasOne relationship to `Doctor` model.
  User.hasOne(models.Doctor);
  // HasOne relationship to `Patient` model
  User.hasOne(models.Patient);
}
```

### [Doctor model](models/doctor.js)

Used to store doctor's name, reference to meetings created by the doctor and reference to the user account for the doctor.

`Doctor` model in this demo uses only a `name` field. A production use case would store more information:

```js
var Doctor = sequelize.define('Doctor', {

  // name field
  name: {
    type: DataTypes.STRING
  }
});
```

`Doctor` model has a `BelongsTo` association with `User` model to create 1:1 mapping. It also has a `HasMany` association with `Meeting` to map the meetings a doctor creates:

```js
Doctor.associate = function (models) {
  // 1:1 relationship with `User` model
  Doctor.User = Doctor.belongsTo(models.User);
  // 1:M relationship with `Meeting` model.
  Doctor.Meetings = Doctor.hasMany(models.Meeting);
};
```

### [Patient model](models/patient.js)

Same as `Doctor` model, `Patient` model in the demo is used to store patient's name and references to user and meetings. Except, these are meetings booked by the patient.

```js
var Patient = sequelize.define('Patient', {
  name: {
    type: DataTypes.STRING
  }
});
```

```js
Patient.associate = function (models) {
  // 1:1 relationship with `User`
  Patient.User = Patient.belongsTo(models.User);
  // 1:M relationship with `Meeting`
  Patient.Meetings = Patient.hasMany(models.Meeting);
};
```

### [Meeting model](models/meeting.js)

User to store meeting information. Each meeting contains reference to doctor and patient for that meeting, plus start time and end time for the meeting. The auto-generated meeting IDs are used to create meeting URLs and to create different room per meeeting.

```js
var Meeting = sequelize.define('Meeting', {
  // Store start date and time for meeting
  start_time: DataTypes.DATE,
  // Store end date and time for meeting
  end_time: DataTypes.DATE
});
```

Each `Meeting` belongs to one `Doctor` and one `Patient`. When a doctor creates a meeting, `Meeting` is initialized with `NULL` value for `Patient`. Once a patient books the meeting, the `Patient` ID is added to the `Meeting`.

```js
Meeting.associate = function (models) {
  // 1:1 relationship with `Doctor`
  Meeting.Doctor = Meeting.belongsTo(models.Doctor);
  // 1:1 relationship with `Patient`
  Meeting.Patient = Meeting.belongsTo(models.Patient);
};
```

### [Appdata model](models/appdata.js)

Used to store application data as key-value pairs. This is only used to store the OpenTok video embed code to use in the meetings. There are different ways for storing application configuration for real-world applications. This demo uses this model to avoid storing the OpenTok Embed code in a separate file. See [`Appdata`](models/appdata.js) model for the model schema.

We'll move on to the more interesting parts.

### Model bootstrapping

The script at [`models/index.js`](models/index.js) bootstraps the models, establishes database connection using data from `DATABASE_URL` environment variable and loads all models in the directory. The loaded models are added as properties of the exported object, effectively converting the [`models`](models) directory in a module.

The rest of the application can load models by `require()`-ing this directory, like:

```js
// Load the `models` directory from project root. Adjust relative path for
// nested directories.
const models = require('./models');

// The models are now available as:
// - `models.User`
// - `models.Doctor`
// - `models.Patient`
// - `models.Meeting`
// - `models.Appdata`
```

## Server startup script

The script at [`./bin/www`](bin/www) lauches the application. It does these two things:

- launch sequelize and synchronize database, creating tables if required
- require the ExpressJS `app` and launch a `HTTP` server depending on the port configuration specified

Set up the `app` and `http` instances:

```js
// Load dependencies, including `app.js` and the `models` module from project
// root
const app = require('../app');
const http = require('http');
const models = require('../models');

// Get port from environment and store in Express.
const port = process.env.PORT || '3000';
app.set('port', port);

// Create HTTP server.
const server = http.createServer(app);
```

Connect Sequelize to DB and start HTTP server if successful:

```js
// Call `sequelize.sync()` which synchronizes model states with database
// and create tables if necessary. This method returns a `Promise`.
models.sequelize.sync()
  .then(() => {
    // If DB was successfully synced, launch HTTP server
    server.listen(port);
  })
  .catch((err) => {
    console.error('Error synchronizing DB', err);
    process.exit(1);
  });
```

