const { kv } = require('@vercel/kv');
const { randomUUID } = require('crypto');
const { requireAuth } = require('../../../../lib/auth');

module.exports = async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  const { id } = req.query;
  const key = 'ads:' + id;

  if (req.method === 'GET') {
    const raw = (await kv.hgetall(key)) || {};
    const ads = Object.entries(raw)
      .map(([adId, val]) => {
        const data = typeof val === 'string' ? JSON.parse(val) : val;
        return { id: adId, ...data };
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    res.status(200).json(ads);
    return;
  }

  if (req.method === 'POST') {
    const adId = randomUUID();
    const doc = Object.assign(
      {
        angle: '',
        headline: '',
        primaryText: '',
        cta: 'Get a Print Quote',
        audience: [],
        visualBrief: '',
        order: 0,
        kpis: { reach: 0, impressions: 0, linkClicks: 0, quoteRequests: 0, spend: 0 },
      },
      req.body || {}
    );
    await kv.hset(key, { [adId]: JSON.stringify(doc) });
    res.status(200).json({ id: adId, ...doc });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
