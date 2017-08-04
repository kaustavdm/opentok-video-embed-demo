/* global DB */

const router = require('express').Router();

router.use((req, res, next) => {
  // Set lock on embed code setup
  res.locals.lock_setup = process.env.LOCK_SETUP == 'true' && DB.embed_code ? true : false;
  req.app.set('lock_setup', res.locals.lock_setup);
  next();
});

router.get('/', (req, res) => {
  res.render('home');
});

router.use('/setup', require('./setup_route'));
router.use('/dashboard', require('./dashboard_route'));
router.use('/meetings', require('./meetings_route'));

module.exports = router;
