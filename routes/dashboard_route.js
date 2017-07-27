const router = require('express').Router();
const models = require('../models');
const helper = require('./route_helper');
const debug = require('util').debuglog('app');

router.get('/', helper.ensure_logged_in, (req, res, next) => {
  let u;

  if (req.session.user.role === 'Doctor') {
    u = req.User.getDoctor()
      .then(D => {
        res.locals.user.name = D.name;
        return D.getMeetings({
          where: { start_time: { $gt: new Date() }},
          raw: true,
          include: [{
            model: models.Patient,
            attributes: ['name']
          }]
        });
      })
      .then(m => {
        res.render('dashboard_doctor', { meetings: m });
      });
  } else if (req.session.user.role === 'Patient') {
    u = req.User.getPatient()
      .then(P => {
        res.locals.user.name = P.name;
        return P.getMeetings({
          where: { start_time: { $gt: new Date() }},
          raw: true,
          include: [{
            model: models.Doctor,
            attributes: ['name']
          }]
        })
      })
      .then(m => {
        res.render('dashboard_patient', { meetings: m });
      });
  } else {
    res.redirect('/user/logout');
    return;
  }

  u.catch(err => {
    next(err);
  });
});


module.exports = router;
