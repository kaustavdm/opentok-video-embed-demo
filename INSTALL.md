# Installing this appliation

This application uses PostgreSQL for database and NodeJS for server-side rendering. It can also be installed on Heroku with one-click by clicking the button below.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/kaustavdm/ot_embed_appointment_demo)

## Requirements

Install the following:

- PostgreSQL server v9.6+
- NodeJS v6.9.0+
- NPM v5.1.0+
- Git (optional)

## Setup

Clone or [download](https://github.com/kaustavdm/ot_embed_appointment_demo/archive/master.zip) the project and change to the project root directory:

```sh
$ git clone git://github.com/kaustavdm/ot_embed_appointment_demo
$ cd ot_embed_appointment_demo
```

Install application dependencies:

```sh
$ npm install
```

Set PostgreSQL database URL as environment variable `DATABASE_URL`:

```sh
$ export DATABASE_URL=postgres://user:password@host/db
```

Start the application on default port (3000):

```sh
$ npm start
```

To run the application on a different port, say `8080`, specify the `PORT` environment variable:

```sh
$ PORT=8080 npm start
```

## First time setup

- Create an OpenTok video embed and copy the generated code
- Once the application is up and running, open it in Firefox or Google Chrome.
- Click the button "Setup/Update embed code"
- Paste the embed code in the text box and click "Set up"

**Note**: If you don't want the setup option to be available after first setup, start the application with environment variable `LOCK_SETUP=true`.

### Setting up SSL

WebRTC requires web applications to be served over a secure channel. So, this application needs to be hosted on HTTPS to participate in meetings. Heroku serves all applications on HTTPS, so no need to worry about this if deploying to Heroku. Else, consider setting up [nginx as a reverse proxy with SSL termination](https://www.sitepoint.com/configuring-nginx-ssl-node-js/).

### Debug

Use `NODE_DEBUG` environment variable to turn on debug flags for specific components. `NODE_DEBUG` takes a comma-separated string of component names. Available components for this application are:

- `app`: Shows debug messages for the application, including any errors caught by the application
- `db`: Shows debug messages from the database layer, including executed SQL queries.

Here are few examples of using the debug mode:

Debug messages for application only:

```sh
$ NODE_DEBUG=app npm start
```

Debug messages for both application and database

```sh
$ NODE_DEBUG=app,db npm start
```
