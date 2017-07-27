const router = require('express').Router();
const models = require('../models');

router.get('/book', (req, res) => {
  res.render('book_appointment');
});

router.get('/create_slot', (req, res) => {
  res.render('create_appointment_slot');
});

router.get('/join/:meeting_id', (req, res) => {
  res.render('meeting');
});

module.exports = router;
