
const ensure_logged_in = (req, res, next) => {
  if (!(req.session.user && req.signedCookies.ot_embed_demo_sid)) {
    res.redirect('/');
  } else {
    next();
  }
};

const redirect_logged_in = (req, res, next) => {
  if (req.session.user && req.signedCookies.ot_embed_demo_sid) {
    res.redirect('/user/dashboard');
  } else {
    next();
  }
}

module.exports = {
  ensure_logged_in,
  redirect_logged_in
}
