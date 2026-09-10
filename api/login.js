const { checkPassword, createToken, isAuthed, isConfigured, COOKIE_NAME, MAX_AGE_SECONDS } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ authed: isAuthed(req), configured: isConfigured() });
    return;
  }

  if (req.method === 'POST') {
    const password = (req.body || {}).password;
    if (!isConfigured()) {
      res.status(500).json({ error: 'No DASHBOARD_PASSWORD is set on this deployment.' });
      return;
    }
    if (!checkPassword(password)) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }
    res.setHeader(
      'Set-Cookie',
      COOKIE_NAME + '=' + createToken() + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + MAX_AGE_SECONDS
    );
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
