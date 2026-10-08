const express = require('express');
const rateLimit = require('express-rate-limit');
const store = require('../lib/store');
const mailer = require('../lib/mailer');
const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many messages. Please try again later or reach us on WhatsApp.' } });
const cut = (v, n = 1000) => String(v || '').trim().slice(0, n);

// POST /api/contact  — used by the contact form and the HAT AI chatbot
router.post('/', limiter, (req, res) => {
  const b = req.body || {};
  const source = b.source === 'chatbot' ? 'chatbot' : 'contact-form';
  const lead = { source, name: cut(b.name, 100) || (source === 'chatbot' ? 'Chatbot visitor' : ''), company: cut(b.company, 150), email: cut(b.email, 150),
    phone: cut(b.phone, 30), project_type: cut(b.project_type, 100), budget: cut(b.budget, 100), details: cut(b.details) };

  if (!lead.name) return res.status(400).json({ success: false, error: 'Please enter your name.' });
  const digits = lead.phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return res.status(400).json({ success: false, error: 'Please enter a valid WhatsApp number.' });
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });

  store.add('inquiries', lead);
  mailer.notify(lead).catch((e) => console.error('[mail] failed:', e.message));
  console.log(`\n📩 New ${source} lead: ${lead.name} · ${lead.phone}`);
  res.json({ success: true, message: "We'll contact you within 24 hours on WhatsApp, so stay updated." });
});
module.exports = router;
