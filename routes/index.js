const router = require('express').Router();
const helper = require('./route_helper');

router.get('/', helper.redirect_logged_in, (req, res) => {
  res.render('home');
});

router.use('/user', require('./user_route'));
router.use('/dashboard', require('./dashboard_route'));
router.use('/meetings', require('./meetings_route'));

module.exports = router;
