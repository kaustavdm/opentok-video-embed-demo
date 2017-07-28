const router = require('express').Router();
const helper = require('./route_helper');
const models = require('../models');

router.use((req, res, next) => {
  // Set lock on embed code setup
  models.Appdata.findOne({
    where: { key: 'embed_code' },
    raw: true
  })
  .then(embed_code => {
    req.embed_code = embed_code == null ? false : embed_code.value;
    res.locals.lock_setup = process.env.LOCK_SETUP == 'true' && req.embed_code ? true : false;
    req.app.set('lock_setup', res.locals.lock_setup);
    next();
  })
  .catch(next);
});

router.get('/', helper.redirect_logged_in, (req, res) => {
  res.render('home');
});

router.use('/setup', require('./setup_route'));
router.use('/user', require('./user_route'));
router.use('/dashboard', require('./dashboard_route'));
router.use('/meetings', require('./meetings_route'));

module.exports = router;
