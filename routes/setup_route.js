/* global DB */

const router = require('express').Router();
const debug = require('util').debuglog('app');


router.use((req, res, next) => {
  if (req.app.get('lock_setup')) {
    res.redirect('/');
  } else {
    next();
  }
});

router.get('/', (req, res) => {
  res.render('setup', { data: DB.embed_code || "" });
});

router.post('/', (req, res) => {
  DB.embed_code = req.body.embed_code_value.trim();
  debug('New embed code', DB.embed_code);
  res.redirect('/');
});


module.exports = router;
