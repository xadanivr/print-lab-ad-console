const crypto = require('crypto');

const COOKIE_NAME = 'plac_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  return process.env.DASHBOARD_PASSWORD || '';
}

function sign(exp) {
  return crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex');
}

function createToken() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  return exp + '.' + sign(exp);
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyToken(token) {
  if (!token || !secret()) return false;
  const parts = String(token).split('.');
  if (parts.length !== 2) return false;
  const exp = parseInt(parts[0], 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(parts[1], sign(exp));
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  const hit = header
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.indexOf(name + '=') === 0);
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function isAuthed(req) {
  return verifyToken(readCookie(req, COOKIE_NAME));
}

// Returns true when the request may proceed; otherwise responds 401 and returns false.
function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  res.status(401).json({ error: 'unauthorized' });
  return false;
}

function checkPassword(input) {
  if (!secret() || typeof input !== 'string' || !input.length) return false;
  return safeEqual(input, secret());
}

module.exports = {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  createToken,
  isAuthed,
  requireAuth,
  checkPassword,
  isConfigured: () => !!secret(),
};
