/* ================================================================
   HAT — MAIN JS
   Handles: loader, nav, theme, AOS, 3D tilt, parallax, chatbot,
            counters, FAQ, contact form, filters, chatbot
================================================================ */

/* ── 1. LOADER ──────────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) setTimeout(() => loader.classList.add('hidden'), 900);
});

/* ── 3. HEADER SCROLL ───────────────────────────────────────── */
(function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ── 4. HAMBURGER MENU ──────────────────────────────────────── */
(function initHamburger() {
  const btn   = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  if (!btn || !links) return;
  btn.addEventListener('click', () => links.classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => links.classList.remove('open')));
})();

/* ── 5. ACTIVE NAV LINK ON SCROLL ──────────────────────────── */
(function initActiveLink() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-link[href^="#"]');
  const navH     = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { rootMargin: `-${navH + 20}px 0px -60% 0px` });
  sections.forEach(s => observer.observe(s));
})();

/* ── 6. SCROLL ANIMATIONS (AOS) ─────────────────────────────── */
(function initAOS() {
  const els = document.querySelectorAll('[data-aos]');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('aos-animate'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  els.forEach(el => io.observe(el));
})();

/* ── 7. COUNT-UP ANIMATION ──────────────────────────────────── */
(function initCounters() {
  const nums = document.querySelectorAll('[data-count]');
  if (!nums.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el     = e.target;
      const target = parseInt(el.dataset.count);
      const dur    = 1800;
      const step   = target / (dur / 16);
      let cur      = 0;
      const tick   = () => {
        cur += step;
        if (cur >= target) { el.textContent = target; return; }
        el.textContent = Math.floor(cur);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: .5 });
  nums.forEach(n => io.observe(n));
})();

/* ── 8. 3D CARD TILT ────────────────────────────────────────── */
(function init3DTilt() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 768) return;

  const cards = document.querySelectorAll('.service-card, .why-card, .pillar');

  cards.forEach(card => {
    card.classList.add('tilt-card');
    const max = 12;

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x  = (e.clientX - rect.left) / rect.width  - 0.5;
      const y  = (e.clientY - rect.top)  / rect.height - 0.5;
      const rX = -y * max;
      const rY =  x * max;
      card.style.transform = `perspective(800px) rotateX(${rX}deg) rotateY(${rY}deg) translateZ(6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)';
      card.style.transition = 'transform .5s ease';
    });
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform .1s ease';
    });
  });
})();

/* ── 10. BLOB PARALLAX ON SCROLL ───────────────────────────── */
(function initBlobScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const blobs = document.querySelectorAll('.blob');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    blobs.forEach((b, i) => {
      b.style.transform = `translateY(${y * (i % 2 === 0 ? 0.08 : -0.06)}px)`;
    });
  }, { passive: true });
})();

/* ── 11. HERO BADGE ROTATION ────────────────────────────────── */
(function initBadgeRotate() {
  const badge = document.querySelector('.hero-badge');
  if (!badge) return;
  const messages = [
    'Your digital technology partner',
    'Most sites delivered in 1–2 weeks',
    'Chat with us on WhatsApp anytime',
  ];
  let i = 0;
  setInterval(() => {
    badge.style.opacity = '0';
    badge.style.transition = 'opacity .4s ease';
    setTimeout(() => {
      i = (i + 1) % messages.length;
      badge.innerHTML = `<span class="badge-dot"></span> ${messages[i]}`;
      badge.style.opacity = '1';
    }, 400);
  }, 3500);
})();

/* ── 12. FAQ ACCORDION ──────────────────────────────────────── */
(function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
})();

/* ── 14. CONTACT FORM ────────────────────────────────────────── */
(function initContactForm() {
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  if (!form) return;
  const box = form.closest('.contact-form-wrapper');
  const KEY = 'hat_contact_sent', DAY = 24 * 60 * 60 * 1000;
  const DONE = "We'll contact you within 24 hours on WhatsApp, so stay updated.";

  // Replace the whole form box with the thank-you message so it can't be filled again
  function showThanks(name) {
    form.style.display = 'none';
    if (box.querySelector('.contact-thanks')) return;
    const d = document.createElement('div');
    d.className = 'contact-thanks'; d.setAttribute('role', 'status');
    const ic = document.createElement('div'); ic.className = 'ct-icon'; ic.textContent = '✓';
    const h = document.createElement('h3'); h.textContent = name ? `Thank you, ${name}!` : 'Thank you!';
    const p = document.createElement('p'); p.textContent = DONE;
    const s = document.createElement('small'); s.textContent = 'Your message has been received — no need to send it again.';
    d.append(ic, h, p, s); box.appendChild(d);
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Date.now() - saved.t < DAY) showThanks(saved.n); else localStorage.removeItem(KEY);
  } catch (e) {}

  form.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    const f = n => form.querySelector(`[name="${n}"]`);
    let valid = true;
    const digits = f('phone').value.replace(/\D/g, '');
    if (!f('name').value.trim()) { document.getElementById('fnameError').textContent = 'Name is required'; valid = false; }
    if (digits.length < 8 || digits.length > 15) { document.getElementById('fphoneError').textContent = 'Enter a valid WhatsApp number'; valid = false; }
    if (f('email').value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f('email').value.trim())) {
      document.getElementById('femailError').textContent = 'Please enter a valid email'; valid = false;
    }
    if (!valid) return;

    submitBtn.querySelector('span').textContent = 'Sending…';
    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'contact-form', name: f('name').value, company: f('company').value, email: f('email').value,
          phone: f('phone').value, project_type: f('project_type').value, budget: f('budget').value, details: f('details').value })
      });
      const data = await res.json();
      if (data.success) {
        const name = f('name').value.trim();
        try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), n: name })); } catch (e) {}
        form.reset(); showThanks(name);
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      alert('Network error. Please try again or contact us via WhatsApp.');
    } finally {
      submitBtn.querySelector('span').textContent = 'Send Message';
      submitBtn.disabled = false;
    }
  });
})();

/* ── 15. AI CHATBOT → see chatbot.js ───────────────────────── */

/* ── 16. BACK TO TOP ─────────────────────────────────────────── */
(function initBTT() {
  const btn = document.createElement('button');
  btn.setAttribute('aria-label', 'Back to top');
  btn.className = 'btt-btn';
  btn.innerHTML = '↑';
  btn.style.cssText = `
    position:fixed;bottom:100px;right:28px;z-index:700;
    width:40px;height:40px;border-radius:50%;
    background:linear-gradient(135deg,#7c3aed,#ff6b35);
    color:#fff;font-size:1rem;font-weight:700;border:none;cursor:pointer;
    box-shadow:0 4px 16px rgba(124,58,237,.4);
    opacity:0;transform:translateY(16px);
    transition:opacity .3s ease,transform .3s ease;
    display:flex;align-items:center;justify-content:center;
  `;
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    const show = window.scrollY > 500;
    btn.style.opacity   = show ? '1' : '0';
    btn.style.transform = show ? 'translateY(0)' : 'translateY(16px)';
    btn.style.pointerEvents = show ? 'auto' : 'none';
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ── 17. SMOOTH SCROLL ───────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
  });
});
