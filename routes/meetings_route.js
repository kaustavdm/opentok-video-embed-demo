const router = require('express').Router();
const models = require('../models');
const helper = require('./route_helper');

router.use(helper.ensure_logged_in);

/**
 * Render page for booking appointments
 */
router.get('/book', helper.check_role('Patient'), (req, res, next) => {
  models.Doctor.findAll({
    attributes: ['id', 'name'],
    include: [{
      model: models.Meeting,
      attributes: ['id', 'start_time', 'end_time'],
      where: { start_time: { $gt: new Date() }, PatientId: null },
      required: false
    }],
    order: [['name', 'ASC'], [models.Meeting, 'start_time', 'ASC']]
  })
  .then(d => {
    res.render('book_meeting', { doctors: d.map(d => d.get({ plain: true }))})
  })
  .catch(next);
});

/**
 * Handle form for booking appointment
 */
router.post('/book', helper.check_role('Patient'), (req, res, next) => {
  models.Meeting.findById(req.body.meeting_id)
    .then(m => {
      return req.User.getPatient()
        .then(p => {
          return m.setPatient(p);
        })
    })
    .then(() => res.redirect('/dashboard'))
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

router.get('/join/:meeting_id', helper.ensure_logged_in, (req, res, next) => {
  models.Meeting.findOne({
    where: { id: req.params.meeting_id },
    include: [{
      model: models.Doctor,
      attributes: ['id', 'name', 'UserId']
    }, {
      model: models.Patient,
      attributes: ['id', 'name', 'UserId']
    }]
  })
  .then(meeting => {
    if (meeting == null) {
      next();
      return;
    }
    if (req.User.id !== meeting[req.User.role].UserId) {
      next();
      return;
    }
    const embed_code = req.embed_code.replace('DEFAULT_ROOM', `meeting${meeting.id}`);
    if (Date.parse(meeting.end_time) < Date.now()) {
      res.locals.meeting_over = true;
    } else {
      res.locals.meeting_over = false;
    }
    res.render('meeting', { embed_code: embed_code, meeting: meeting.get({ plain: true }) });
  })
  .catch(next);
});

module.exports = router;
