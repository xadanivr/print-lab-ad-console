const { kv } = require('@vercel/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    const meta = (await kv.get('meta')) || { seeded: false, isExample: false };
    res.status(200).json(meta);
    return;
  }
  if (req.method === 'POST') {
    const body = req.body || {};
    await kv.set('meta', body);
    res.status(200).json(body);
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
};
