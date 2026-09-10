const { kv } = require('@vercel/kv');
const { requireAuth } = require('../../../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const { id, adId } = req.query;
  const key = 'ads:' + id;

  if (req.method === 'PATCH') {
    const existingRaw = await kv.hget(key, adId);
    const existing = existingRaw ? (typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw) : {};
    const updated = Object.assign({}, existing, req.body || {});
    await kv.hset(key, { [adId]: JSON.stringify(updated) });
    res.status(200).json({ id: adId, ...updated });
    return;
  }

  if (req.method === 'DELETE') {
    await kv.hdel(key, adId);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
