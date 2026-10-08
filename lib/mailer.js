// Emails every lead to MAIL_TO (default heet@email.com). Needs SMTP_* in .env; never blocks the visitor.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let transport, warned = false;
function get() {
  if (transport !== undefined) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST) return (transport = null);
  try {
    transport = require('nodemailer').createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465, auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined });
  } catch { console.warn('[mail] nodemailer not installed — run: npm install'); transport = null; }
  return transport;
}
async function notify(l) {
  const t = get();
  if (!t) { if (!warned) { warned = true; console.warn('[mail] SMTP not configured — leads are saved in /admin only. Set SMTP_* in .env to get emails.'); } return false; }
  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
  const rows = [['Source', l.source === 'chatbot' ? 'HAT AI chatbot' : 'Contact form'], ['Name', l.name], ['WhatsApp / Phone', l.phone], ['Email', l.email],
    ['Company', l.company], ['Project type', l.project_type], ['Budget range', l.budget], ['Project details', l.details], ['Received', when]];
  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER, to: process.env.MAIL_TO || 'heet@email.com', replyTo: l.email || undefined,
    subject: `New HAT lead: ${l.name}`.replace(/[\r\n]+/g, ' '),
    text: rows.map(([k, v]) => `${k}: ${v || '—'}`).join('\n'),
    html: `<h2 style="font-family:sans-serif">New HAT lead</h2><table cellpadding="8" style="font-family:sans-serif;border-collapse:collapse">${rows.map(([k, v]) =>
      `<tr><td style="border-bottom:1px solid #eee;color:#666"><b>${k}</b></td><td style="border-bottom:1px solid #eee">${esc(v || '—').replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`,
  });
  return true;
}
module.exports = { notify };
