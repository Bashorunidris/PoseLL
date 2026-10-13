// Vercel serverless function: api/claim.js  (put it in your repo at api/claim.js)
// Checks a purchase with Lagos Life (Vatar) from a SERVER, then marks it delivered.
const API = 'https://lagoslife.app/api/games/v1';
const KEY = process.env.VATAR_SECRET || 'vtr_test_f8388fb3089d4c838ed1_r9N8nTT4x4M2A_sS6O8SMvLGozJngf6CP7uZHGSNqlc';
const call = async (path, body) => {
  const r = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { http: r.status, ...(await r.json().catch(() => ({}))) };
};
module.exports = async (req, res) => {
  if (req.method === 'GET') { // quick check: open /api/claim in your phone browser
    const t = await call('/session/verify', { session: 'test' });
    return res.status(200).json({ server: 'ok', keyStartsWith: KEY.slice(0, 12), lagosLifeAnswer: t });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { session, purchaseId, step } = req.body || {};
  if (!session || !purchaseId) return res.status(400).json({ error: 'bad_request' });
  const me = await call('/session/verify', { session });
  if (me.http !== 200) return res.status(401).json({ error: 'auth', detail: me });
  const p = await call('/purchases/' + encodeURIComponent(purchaseId));
  if (p.http !== 200 || p.playerId !== me.playerId) return res.status(403).json({ error: 'forbidden', detail: p });
  if (p.status === 'refunded') return res.status(409).json({ error: 'refunded' });
  if (step === 'deliver') {
    const d = await call('/purchases/' + encodeURIComponent(purchaseId) + '/deliver', {});
    return res.status(d.http === 200 ? 200 : 409).json({ ok: d.http === 200 });
  }
  return res.status(200).json({ ok: true, productId: p.productId, playerId: p.playerId });
};
