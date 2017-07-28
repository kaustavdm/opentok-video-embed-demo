const router = require('express').Router();
const models = require('../models');
const helper = require('./route_helper');

router.get('/', helper.ensure_logged_in, (req, res, next) => {
  let u;
  const qdate = new Date(Date.now() - (60000*60*24));
  let mopts_include = include_role => {
    return {
      where: { start_time: { $gt: qdate }},
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
    const current = m.filter(i => i.start_time.getTime() < currtime && i.end_time.getTime() >= currtime);
    const upcoming = m.filter(i => i.end_time.getTime() >= currtime);
    const past = m.filter(i => i.end_time.getTime() < currtime);
    return {
      upcoming: upcoming,
      past: past,
      current: current
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
