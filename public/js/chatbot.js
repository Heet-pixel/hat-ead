/* HAT AI assistant — tap a question, get the matching answer; finish with "Contact me" (WhatsApp number → lead). */
(function () {
  'use strict';
  const toggle = document.getElementById('chatToggle'), panel = document.getElementById('chatPanel'), closeBtn = document.getElementById('chatClose');
  const msgs = document.getElementById('chatMessages'), box = document.getElementById('chatOptions');
  if (!toggle || !panel || !msgs || !box) return;

  const DONE = "We'll contact you within 24 hours on WhatsApp, so stay updated.";
  let data = { works: [], languages: [], services: [] };
  if (window.HAT && HAT.data) HAT.data.then((d) => { data = d; });
  const or = (a, fb) => (a && a.length ? a : fb);
  const bullets = (a) => a.map((x) => '• ' + x).join('\n');
  const asked = [];

  const QA = {
    services: { q: 'What services do you offer?', next: ['tech', 'time', 'work'],
      a: () => "Here's what HAT builds:\n" + bullets(or(data.services, ['Business Websites', 'E-Commerce', 'SaaS Platforms', 'Web Applications', 'Custom Software', 'Admin Dashboards'])) + '\n\nFrom a simple landing page to a full SaaS platform — we cover every layer.' },
    time: { q: 'How long does a website take?', next: ['cost', 'services', 'work'],
      a: () => "Most websites are delivered in 1–2 weeks, depending on complexity. SaaS platforms and custom software can take 3–6 weeks. You'll get daily progress updates on WhatsApp throughout." },
    tech: { q: 'What tech do you use?', next: ['services', 'design', 'work'],
      a: () => 'We work with:\n' + bullets(or(data.languages, ['React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Tailwind CSS'])) + '\n\nWe choose the tech for your needs — not for convenience.' },
    work: { q: 'Show me your work', next: ['services', 'tech', 'cost'], scroll: true,
      a: () => data.works.length
        ? `We've built ${data.works.length} project${data.works.length > 1 ? 's' : ''} so far. I've scrolled the page to our Work Experience section — tap any project to see the languages, tech and services used.`
        : "We're adding our latest projects right now. Tell us what you need and we'll share relevant examples on WhatsApp." },
    own: { q: 'Do I own the website?', next: ['support', 'hosting', 'cost'],
      a: () => 'Yes, 100%. All code, assets and content belong to you after final payment — HAT gives you full ownership of everything we build.' },
    design: { q: 'Can you design my brand & UI?', next: ['services', 'time', 'work'],
      a: () => "Absolutely. We offer full UI/UX design — logo, colour palette, typography and brand identity. You don't need to bring any design assets." },
    hosting: { q: 'Do you handle hosting & domain?', next: ['support', 'cost', 'time'],
      a: () => 'Yes! We handle deployment, domain setup, SSL and hosting — VPS, shared hosting, AWS, Vercel and more.' },
    support: { q: 'What about support after launch?', next: ['own', 'hosting', 'cost'],
      a: () => 'HAT provides ongoing support and maintenance. Post-launch changes are handled promptly, and monthly maintenance plans are available for regular updates.' },
    cost: { q: 'How much will it cost?', next: ['time', 'services', 'work'],
      a: () => "Every project is different, so we quote based on what you need — pages, features and timeline. Share your WhatsApp number and we'll send a custom quote." },
  };
  const LABEL = { menu: '⬅ Back to menu', more: 'More questions', contact: '📲 Contact me' };
  const MENU = ['services', 'time', 'tech', 'work', 'more', 'contact'];
  const MORE = ['own', 'design', 'hosting', 'support', 'cost', 'contact', 'menu'];

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const bubble = (text, who) => { const b = el('div', `chat-bubble ${who} pl`, text); msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight; return b; };
  function typing() { const b = el('div', 'chat-bubble bot typing'); b.append(el('i'), el('i'), el('i')); msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight; return b; }
  function say(text, then) { box.replaceChildren(); const t = typing(); setTimeout(() => { t.remove(); bubble(text, 'bot'); then && then(); }, 550); }
  function options(keys) {
    box.replaceChildren();
    keys.forEach((k) => { const b = el('button', 'chat-option', LABEL[k] || QA[k].q); b.addEventListener('click', () => ask(k)); box.appendChild(b); });
  }

  function ask(k) {
    if (k === 'menu') { bubble('Back to menu', 'user'); return say('Sure! What would you like to know?', () => options(MENU)); }
    if (k === 'more') { bubble('More questions', 'user'); return say('Here are more things people ask:', () => options(MORE)); }
    if (k === 'contact') { bubble('Contact me', 'user'); return contact(); }
    const qa = QA[k]; bubble(qa.q, 'user'); asked.push(qa.q);
    if (qa.scroll) document.querySelector('#work')?.scrollIntoView({ behavior: 'smooth' });
    say(qa.a(), () => options([...qa.next, 'contact', 'menu']));
  }

  function contact() {
    say('Happy to help! 😊 Enter your WhatsApp number and we\'ll get back to you within 24 hours.', () => {
      const f = el('form', 'chat-lead'), row = el('div', 'row'), inp = el('input'), send = el('button', 'send', 'Send'), msg = el('div', 'msg'), back = el('button', 'back', '⬅ Back to menu');
      inp.type = 'tel'; inp.placeholder = '+91 98765 43210'; inp.autocomplete = 'tel'; inp.required = true; inp.setAttribute('aria-label', 'WhatsApp number');
      send.type = 'submit'; back.type = 'button';
      row.append(inp, send); f.append(row, msg, back); box.replaceChildren(f); inp.focus();
      back.addEventListener('click', () => ask('menu'));
      f.addEventListener('submit', async (e) => {
        e.preventDefault(); msg.textContent = '';
        const digits = inp.value.replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 15) { msg.textContent = 'Please enter a valid number (8–15 digits).'; return; }
        send.disabled = true; send.textContent = '…';
        try {
          const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'chatbot', name: 'Chatbot visitor', phone: inp.value.trim(),
              details: 'Lead from HAT AI chatbot.' + (asked.length ? ' Questions asked: ' + asked.join(' | ') : '') }) });
          const j = await r.json();
          if (!j.success) throw new Error(j.error);
          bubble('📲 ' + inp.value.trim(), 'user');
          say('✅ Thank you! ' + DONE, () => options(['menu']));
        } catch (err) { msg.textContent = err.message || 'Something went wrong. Please try again.'; send.disabled = false; send.textContent = 'Send'; }
      });
    });
  }

  let isOpen = false;
  const setOpen = (v) => { isOpen = v; panel.classList.toggle('open', v); toggle.style.transform = v ? 'rotate(15deg) scale(1.1)' : ''; };
  toggle.addEventListener('click', () => setOpen(!isOpen));
  closeBtn && closeBtn.addEventListener('click', () => setOpen(false));
  options(MENU);
})();
