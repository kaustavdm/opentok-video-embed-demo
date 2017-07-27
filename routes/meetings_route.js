const router = require('express').Router();
const models = require('../models');
const helper = require('./route_helper');

router.use(helper.ensure_logged_in);

router.get('/book', helper.check_role('Patient'), (req, res, next) => {
  models.Meeting.findAll({
    where: { start_time: { $gt: new Date() }, PatientId: null },
    attributes: ['id', 'start_time', 'end_time'],
    order: [['start_time', 'ASC']],
    raw: true,
    include: [{
      model: models.Doctor,
      attributes: ['id', 'name']
    }]
  })
  .then(m => {
    res.render('book_meeting', { meetings: m })
  })
  .catch(next);
});

router.post('/book', helper.check_role('Patient'), (req, res, next) => {
  models.Meeting.findById(req.body.meeting_id)
    .then(m => {
      return req.User.getPatient()
        .then(p => {
          return m.setPatient(p);
        })
    })
    .then(m => res.redirect('/dashboard'))
    .catch(next);
});

router.get('/create', helper.check_role('Doctor'), (req, res) => {
  res.locals.assets.styles.push('flatpickr.min.css');
  res.locals.assets.scripts.push('flatpickr.min.js');
  res.locals.assets.scripts.push('scheduling_ui.js');
  res.render('create_meeting');
});

router.post('/create', helper.check_role('Doctor'), (req, res, next) => {
  const start_time = new Date(req.body.start_date);
  const end_time = new Date(start_time.getTime() + (parseInt(req.body.duration) * 60000));

  req.User.getDoctor()
  .then(doc => {
    return models.Meeting.create({
      start_time: start_time,
      end_time: end_time,
      DoctorId: doc.id
    });
  })
  .then(() => res.redirect('/dashboard'))
  .catch(next);
});

router.get('/join/:meeting_id', (req, res) => {
  res.render('meeting');
});

module.exports = router;
