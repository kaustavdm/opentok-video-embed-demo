# OpenTok Embed appointment demo

A small demo application demonstrating usage of [OpenTok video embeds](https://tokbox.com/developer/embeds/) in appointments.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/kaustavdm/ot_embed_appointment_demo)

# Table of Contents

- [Overview](#overview)
- [Install](#install)
- [Tutorial](#tutorial)

# Overview

OpenTok video embeds are simple embeddable widgets that can be added to web pages to get ready-made video conference with upto participants. Embeds support dynamic rooms by changing a single URL parameter. This makes it ideal for using it in simple use cases without requiring too much programming. This demo is a small application that demonstrates using dynamic embed rooms along with a simple appointment flow.

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

- Database: PostgreSQL
- Application backend: NodeJS
    - Routing framework: ExpressJS
    - Database ORM: Sequelize
    - View engine: ejs

