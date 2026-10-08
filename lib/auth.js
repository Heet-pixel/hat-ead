const crypto = require('crypto');
const lockout = require('./lockout');

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const EMAIL = (process.env.ADMIN_EMAIL || 'heetshah@gmail.com').toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || '12312312';
const COOKIE = 'hat_admin';
const TTL = 1000 * 60 * 60 * 12; // 12h session

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const mac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');

function credentialsValid(email, password) {
  const a = safeEq(String(email || '').trim().toLowerCase(), EMAIL);
  const b = safeEq(password || '', PASSWORD);
  return a && b;
}
function issue(res) {
  const body = Buffer.from(JSON.stringify({ e: EMAIL, x: Date.now() + TTL })).toString('base64url');
  res.cookie ? res.cookie(COOKIE, `${body}.${mac(body)}`, opts()) :
    res.setHeader('Set-Cookie', `${COOKIE}=${body}.${mac(body)}; ${cookieAttrs(TTL)}`);
}
const opts = () => ({ httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: TTL, path: '/' });
const cookieAttrs = (ttl) => `HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(ttl / 1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
function clear(res) { res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieAttrs(0)}`); }

function isAuthed(req) {
  if (lockout.status(lockout.key(req)).locked) return false;
  const raw = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [body, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!body || !sig || !safeEq(sig, mac(body))) return false;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()).x > Date.now(); } catch { return false; }
}
const requireAuth = (req, res, next) => (isAuthed(req) ? next() : res.status(401).json({ success: false, error: 'Not authorised' }));

module.exports = { credentialsValid, issue, clear, isAuthed, requireAuth };
