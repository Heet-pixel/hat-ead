require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');
const siteRoutes = require('./routes/site');
const { isAuthed } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 3000;
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1); // needed behind nginx/Cloudflare so lockout sees real IPs

// ── Security & middleware ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    }
  }
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Admin (own limiter on login; sessions via signed httpOnly cookie) ──
app.use('/api/admin', adminRoutes);
app.get(['/admin', '/admin/'], (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'admin', isAuthed(req) ? 'dashboard.html' : 'login.html'));
});
app.get('/admin/*', (req, res) => res.redirect('/admin'));

// ── Rate limiting ────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ── Static files ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true
}));

// ── API routes ───────────────────────────────────────────────────
app.use('/api/contact', contactRoutes);
app.use('/api/site', siteRoutes);

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve index for all other routes (SPA fallback) ─────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 HAT Website running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
