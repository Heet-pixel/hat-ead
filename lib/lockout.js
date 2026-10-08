// Admin login lockout: 5 wrong attempts from one IP => locked for 24 hours (persisted across restarts).
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'lockout.json');
const MAX = 5, DAY = 24 * 60 * 60 * 1000;
let s = {};
try { s = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { s = {}; }
const save = () => { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(s)); } catch (e) { console.error('lockout save failed', e.message); } };

const key = (req) => String(req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
function status(k) {
  const e = s[k], now = Date.now();
  if (!e) return { locked: false, left: MAX };
  if (e.until && e.until > now) return { locked: true, until: e.until, left: 0 };
  if (e.until || now - e.first > DAY) { delete s[k]; save(); return { locked: false, left: MAX }; }
  return { locked: false, left: MAX - e.fails };
}
function fail(k) {
  const now = Date.now(), e = status(k).left === MAX ? (s[k] = { fails: 0, first: now }) : s[k];
  e.fails++; if (e.fails >= MAX) e.until = now + DAY;
  save(); return status(k);
}
const ok = (k) => { if (s[k]) { delete s[k]; save(); } };
module.exports = { key, status, fail, ok, MAX };
