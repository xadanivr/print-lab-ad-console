const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const existingRaw = await kv.hget('weeks', id);
    const existing = existingRaw ? (typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw) : {};
    const updated = Object.assign({}, existing, req.body || {});
    await kv.hset('weeks', { [id]: JSON.stringify(updated) });
    res.status(200).json({ id, ...updated });
    return;
  }

  if (req.method === 'DELETE') {
    await kv.hdel('weeks', id);
    await kv.del('ads:' + id);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
