const router = require('express').Router();
const models = require('../models');
const helper = require('./route_helper');

let m_filter = m => {
  const currtime = Date.now();

  return {
    // Starting after 5 minutes
    upcoming: m.filter(i => i.start_time.getTime() >= currtime + 300000 ),
    // Starting in 5 minutes or has already started
    current: m.filter(i => i.start_time.getTime() < currtime + 300000 && i.end_time.getTime() >= currtime)
  }
};

/**
 * Doctor's dashboard
 */
router.get('/doctor', helper.ensure_logged_in, helper.check_role('Doctor'), (req, res, next) => {
  req.User.getDoctor({
    include: [{
      model: models.Meeting,
      attributes: ['id', 'start_time', 'end_time'],
      where: { end_time: { $gt: new Date() }},
      required: false,
      include: [{
        model: models.Patient,
        attributes: ['id', 'name'],
        required: false
      }]
    }],
    order: [[ models.Meeting, 'start_time', 'ASC']]
  })
    .then(D => {
      res.locals.user.name = D.name;
      const doc = D.get({ plain: true });
      res.render('dashboard_doctor', { meetings: m_filter(doc.Meetings), doctor: doc })
    })
    .catch(next);
});

/**
 * Patient's dashboard
 */
router.get('/patient', helper.ensure_logged_in, helper.check_role('Patient'), (req, res, next) => {
  req.User.getPatient({
    include: [{
      model: models.Meeting,
      attributes: ['id', 'start_time', 'end_time'],
      where: { end_time: { $gt: new Date() }},
      required: false,
      include: [{
        model: models.Doctor,
        attributes: ['id', 'name']
      }]
    }],
    order: [[ models.Meeting, 'start_time', 'ASC']]
  })
    .then(P => {
      res.locals.user.name = P.name;
      const patient = P.get({ plain: true });
      // console.log(m_filter(patient.Meetings));
      res.render('dashboard_patient', { meetings: m_filter(patient.Meetings), patient: patient })
    })
    .catch(next);
});

/**
 * Redirect to role-specific dashboard depending on current logged in user's role
 */
router.get('/', helper.ensure_logged_in, (req, res, next) => {
  if (req.User.role === 'Doctor') {
    res.redirect('/dashboard/doctor');
  } else if (req.User.role === 'Patient') {
    res.redirect('/dashboard/patient');
  } else {
    next(new Error('Invalid user role'));
  }
});

module.exports = router;
