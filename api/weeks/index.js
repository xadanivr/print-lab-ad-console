const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const raw = (await kv.hgetall('weeks')) || {};
    const weeks = Object.entries(raw).map(([id, val]) => {
      const data = typeof val === 'string' ? JSON.parse(val) : val;
      return { id, ...data };
    });
    res.status(200).json(weeks);
    return;
  }
  if (req.method === 'POST') {
    const { id, weekStart, weekEnd, label, resumeNotes } = req.body || {};
    if (!id || !weekStart || !weekEnd) {
      res.status(400).json({ error: 'id, weekStart and weekEnd are required' });
      return;
    }
    const doc = { weekStart, weekEnd, label: label || '', resumeNotes: resumeNotes || '' };
    await kv.hset('weeks', { [id]: JSON.stringify(doc) });
    res.status(200).json({ id, ...doc });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
};
