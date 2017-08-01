const router = require('express').Router();
const models = require('../models');
const helper = require('./route_helper');

router.get('/', helper.ensure_logged_in, (req, res, next) => {
  let u;

  let mopts_include = include_role => {
    return {
      where: { end_time: { $gt: new Date() }},
      order: [['start_time', 'ASC']],
      raw: true,
      include: [{
        model: models[include_role],
        attributes: ['name']
      }]
    }
  };

  let m_filter = m => {
    const currtime = Date.now();

    return {
      // Starting after 5 minutes
      upcoming: m.filter(i => i.start_time.getTime() >= currtime + 300000 ),
      // Starting in 5 minutes or has already started
      current: m.filter(i => i.start_time.getTime() < currtime + 300000 && i.end_time.getTime() >= currtime)
    }
  };

  if (req.session.user.role === 'Doctor') {
    u = req.User.getDoctor()
      .then(D => {
        res.locals.user.name = D.name;
        return D.getMeetings(mopts_include('Patient'));
      })
      .then(m => res.render('dashboard_doctor', { meetings: m_filter(m) }));
  } else if (req.session.user.role === 'Patient') {
    u = req.User.getPatient()
      .then(P => {
        res.locals.user.name = P.name;
        return P.getMeetings(mopts_include('Doctor'))
      })
      .then(m => res.render('dashboard_patient', { meetings: m_filter(m) }));
  } else {
    res.redirect('/user/logout');
    return;
  }

  u.catch(err => {
    next(err);
  });
});


module.exports = router;
