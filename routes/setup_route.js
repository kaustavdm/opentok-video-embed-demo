const router = require('express').Router();
const models = require('../models');

router.use((req, res, next) => {
  if (req.app.get('lock_setup')) {
    res.redirect('/');
  } else {
    next();
  }
});

router.get('/', (req, res) => {
  res.render('setup', { data: req.embed_code || "" });
});

router.post('/', (req, res, next) => {
  models.Appdata.findOne({ where: { key: 'embed_code' }})
  .then(embed_code => {
    if (embed_code == null) {
      return models.Appdata.create({
        key: 'embed_code',
        value: req.body.embed_code_value.trim()
      });
    } else {
      return embed_code.update({ value: req.body.embed_code_value.trim() });
    }
  })
  .then(() => {
    req.app.set('lock_setup', process.env.LOCK_SETUP == 'true' ? true : false);
    res.redirect('/');
  })
  .catch(next);
});


module.exports = router;
