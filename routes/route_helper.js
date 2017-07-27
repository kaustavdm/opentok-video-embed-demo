const models = require("../models");
const debug = require('util').debuglog('app');

const ensure_logged_in = (req, res, next) => {
  if (!(req.session.user && req.signedCookies.ot_embed_demo_sid)) {
    res.redirect('/');
  } else {
    models.User.findOne({
      where: { id: req.session.user.id },
      attributes: { exclude: ['password', 'salt']}
    })
      .then(u => {
        res.locals.user = req.session.user;
        req.User = u;
        next();
      })
      .catch(err => {
        next(err);
      });
  }
};

const redirect_logged_in = (req, res, next) => {
  if (req.session.user && req.signedCookies.ot_embed_demo_sid) {
    res.redirect('/dashboard');
  } else {
    next();
  }
}

module.exports = {
  ensure_logged_in,
  redirect_logged_in
}
