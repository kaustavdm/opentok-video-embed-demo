const router = require('express').Router();
const models = require('../models');
const helper = require('./route_helper');
const debug = require('util').debuglog('app');

router.post('/login', helper.redirect_logged_in, (req, res) => {
  const username = req.body.username ? req.body.username.trim() : false;
  const password = req.body.password ? req.body.password.trim() : false;

  if (!username || !password) {
    res.redirect('/');
    return;
  }

  models.User.findOne({ where: { username: username } })
    .then(user => {
      if (!user) {
        // User not found
        res.redirect('/');
        return;
      } else if (!user.checkPassword(password)) {
        // Invalid password
        res.redirect('/');
        return;
      } else {
        // Succeeded
        req.session.user = user.toJSON();
        res.redirect('/user/dashboard');
      }
    })
});

router.post('/register', helper.redirect_logged_in, (req, res) => {
  const username = req.body.username ? req.body.username.trim() : false;
  const password = req.body.password ? req.body.password.trim() : false;
  const role = req.body.role ? req.body.role.trim() : false;
  const name = req.body.name ? req.body.name : false;


  if (!username || !password || !role) {
    res.redirect('/');
    return;
  }

  let user;
  let includeOpts = []

  if (role === 'doctor') {
    user = models.Doctor.create({
      name: name,
      User: {
        username: username,
        password: password,
        role: 'Doctor'
      }
    }, {
    association: models.Doctor.User,
    include: [ models.User ]
  })
  } else if (role === 'patient') {
    user = models.Patient.create({
      name: name,
      User: {
        username: username,
        password: password,
        role: 'Patient'
      }
    }, {
    association: models.Patient.User,
    include: [ models.User ]
  })
  } else {
    // Invalid role
    res.redirect('/');
  }

  user
    .then(u => {
      debug(`New ${role} user created: ${username}`);
      req.session.user = u.User.toJSON();
      res.redirect('/user/dashboard');
    })
    .catch(err => {
      debug(`Error creating ${role} user`, err.errors);
      res.redirect('/');
    });
});

router.get('/logout', (req, res) => {
  if (req.session.user && req.signedCookies.ot_embed_demo_sid) {
    res.clearCookie('ot_embed_demo_sid');
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
})

router.get('/dashboard', helper.ensure_logged_in, (req, res) => {
  res.send('Yo');
});

module.exports = router;
