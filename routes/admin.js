const express = require('express');
const store = require('../lib/store');
const auth = require('../lib/auth');
const lockout = require('../lib/lockout');
const router = express.Router();

const locked = (res, st) => res.status(429).json({ success: false, locked: true, until: st.until, error: 'Too many failed attempts. Admin access is locked for 24 hours.' });
router.get('/status', (req, res) => { const st = lockout.status(lockout.key(req)); res.json({ locked: st.locked, until: st.until || null, left: st.left }); });
router.post('/login', (req, res) => {
  const k = lockout.key(req);
  let st = lockout.status(k);
  if (st.locked) return locked(res, st);
  const { email, password } = req.body || {};
  if (!auth.credentialsValid(email, password)) {
    st = lockout.fail(k);
    if (st.locked) return locked(res, st);
    return res.status(401).json({ success: false, left: st.left, error: `Incorrect email or password. ${st.left} attempt${st.left === 1 ? '' : 's'} left.` });
  }
  lockout.ok(k); auth.issue(res); res.json({ success: true });
});
router.post('/logout', (req, res) => { auth.clear(res); res.json({ success: true }); });
router.use(auth.requireAuth);

// s text · n number · b boolean · a list of names · u http(s) URL
const SCHEMA = {
  clients:   { req: 'name', create: true, fields: { name: 's', website: 'u', type: 's', status: 's', start: 's', end: 's', price: 'n', progress: 'n', description: 's', image: 'u', show: 'b', tech: 'a', services: 'a' } },
  languages: { req: 'name', create: true, fields: { name: 's', category: 's', note: 's' } },
  services:  { req: 'name', create: true, fields: { name: 's', description: 's' } },
  inquiries: { create: false, fields: {} },
};
const MAXLEN = { description: 600 };
// Accepts a full https:// URL, or a site-relative path like /work/natura/ (for projects hosted on this same site).
const toUrl = (v) => {
  v = String(v || '').trim(); if (!v) return '';
  if (/^\/(?!\/)/.test(v)) return v.replace(/[^\w\-./]/g, '').slice(0, 300); // relative path: keep as-is, strip anything unsafe
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href.slice(0, 500) : ''; } catch { return ''; }
};
const toList = (v) => { const a = Array.isArray(v) ? v : String(v || '').split(','); const seen = new Set(); return a.map((x) => String(x).trim().slice(0, 40)).filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).slice(0, 25); };
function clean(schema, body = {}) {
  const out = {};
  for (const [k, t] of Object.entries(schema.fields)) {
    if (body[k] === undefined) continue;
    const v = body[k];
    out[k] = t === 'n' ? Math.max(0, Math.min(1e9, Number(v) || 0)) : t === 'b' ? v === true || v === 'true' || v === 'on' : t === 'a' ? toList(v) : t === 'u' ? toUrl(v) : String(v).trim().slice(0, MAXLEN[k] || 200);
  }
  if (out.progress !== undefined) out.progress = Math.min(100, out.progress);
  return out;
}
function syncCatalog(row) {   // names typed on a website are added to the global lists too
  [['languages', 'tech'], ['services', 'services']].forEach(([col, key]) => {
    const have = new Set(store.list(col).map((x) => x.name.toLowerCase()));
    (row[key] || []).forEach((n) => { if (!have.has(n.toLowerCase())) { have.add(n.toLowerCase()); store.add(col, col === 'languages' ? { name: n, category: 'Other', note: '' } : { name: n, description: '' }); } });
  });
}
const pick = (req, res, next) => { const s = SCHEMA[req.params.col]; if (!s) return res.status(404).json({ success: false, error: 'Unknown list' }); req.schema = s; next(); };

router.get('/data', (req, res) => res.json(store.all()));
router.post('/:col', pick, (req, res) => {
  if (!req.schema.create) return res.status(405).json({ success: false, error: 'Not allowed' });
  const row = clean(req.schema, req.body);
  if (!row[req.schema.req]) return res.status(400).json({ success: false, error: `${req.schema.req} is required` });
  const saved = store.add(req.params.col, row);
  if (req.params.col === 'clients') syncCatalog(saved);
  res.json(saved);
});
router.put('/:col/:id', pick, (req, res) => {
  const row = store.update(req.params.col, req.params.id, clean(req.schema, req.body));
  if (!row) return res.status(404).json({ success: false, error: 'Not found' });
  if (req.params.col === 'clients') syncCatalog(row);
  res.json(row);
});
router.delete('/:col/:id', pick, (req, res) =>
  store.remove(req.params.col, req.params.id) ? res.json({ success: true }) : res.status(404).json({ success: false, error: 'Not found' }));
module.exports = router;
