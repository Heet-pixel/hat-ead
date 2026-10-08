/* HAT — live site data (work experience, languages, services) from the admin panel */
(function () {
  'use strict';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const EMOJI = [['commerce', '🛒'], ['portfolio', '🎨'], ['landing', '🚀'], ['erp', '⚙️'], ['saas', '☁️'], ['web app', '🧩'], ['dashboard', '📊'], ['business', '🏢']];
  const emoji = (t) => { t = (t || '').toLowerCase(); const h = EMOJI.find((e) => t.includes(e[0])); return h ? h[1] : '🌐'; };
  const thumb = (cls, w, big) => {
    const t = el('div', cls, emoji(w.type));
    if (w.image) { const img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = w.image; img.onerror = () => img.remove(); t.appendChild(img); }
    return t;
  };

  window.HAT = window.HAT || {};
  HAT.data = fetch('/api/site').then((r) => (r.ok ? r.json() : Promise.reject())).catch(() => ({ works: [], languages: [], services: [] }));

  const scroller = document.getElementById('workScroll');
  if (!scroller) return;

  /* detail modal */
  const modal = el('div', 'work-modal'); modal.hidden = true;
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = '<div class="wm-back"></div><div class="wm-panel"><button class="wm-close" aria-label="Close">✕</button><div class="wm-body"></div></div>';
  document.body.appendChild(modal);
  const body = modal.querySelector('.wm-body'), closeBtn = modal.querySelector('.wm-close');
  let lastFocus = null;
  const close = () => { modal.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
  modal.querySelector('.wm-back').addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  function chips(title, list) {
    if (!list || !list.length) return null;
    const s = el('div', 'wm-sec'); s.appendChild(el('h5', null, title));
    const c = el('div', 'wm-chips'); list.forEach((n) => c.appendChild(el('span', 'wm-chip', n))); s.appendChild(c); return s;
  }
  function open(w) {
    lastFocus = document.activeElement; body.replaceChildren();
    const c = el('div', 'wm-content');
    if (w.type) c.appendChild(el('span', 'wm-type', w.type));
    c.appendChild(el('h3', null, w.name));
    if (w.description) c.appendChild(el('p', 'wm-desc', w.description));
    [chips('Languages & Tech', w.tech), chips('Services', w.services)].forEach((s) => s && c.appendChild(s));
    if (/^(https?:\/\/|\/(?!\/))/i.test(w.website || '')) {
      const a = el('a', 'btn btn-primary', 'Visit website ↗'); a.href = w.website; a.target = '_blank'; a.rel = 'noopener noreferrer'; c.appendChild(a);
    }
    body.append(thumb('wm-thumb', w), c);
    modal.hidden = false; document.body.style.overflow = 'hidden'; closeBtn.focus();
  }

  HAT.data.then((d) => {
    const works = d.works || [];
    document.getElementById('workEmpty').hidden = works.length > 0;
    scroller.hidden = works.length === 0;
    works.forEach((w) => {
      const card = el('div', 'cat-card'); card.tabIndex = 0; card.setAttribute('role', 'button'); card.setAttribute('aria-label', 'View ' + w.name);
      const info = el('div', 'cat-info');
      info.append(el('h4', null, w.name), el('p', null, w.type || (w.tech || []).slice(0, 3).join(' · ') || 'View project'), el('span', 'cat-arrow', '→'));
      card.append(thumb('cat-thumb', w), info);
      card.addEventListener('click', () => open(w));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(w); } });
      scroller.appendChild(card);
    });
  });
})();
