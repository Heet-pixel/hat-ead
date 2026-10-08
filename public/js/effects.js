/* ================================================================
   HAT — MOUSE INTERACTION LAYER
   One requestAnimationFrame loop, lerp-smoothed, transform/translate
   only (no layout reads during writes). Off for touch + reduced motion.
================================================================ */
(function () {
  'use strict';
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const $ = (s) => Array.from(document.querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const gain = () => (innerWidth < 1100 ? 0.5 : 1);           // tablet: softer
  const m = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  const sm = { nx: 0, ny: 0 };
  const glow = { x: m.x, y: m.y };
  let raf = 0, dirty = true, busy = false, heroOn = true;

  /* glow */
  const gl = document.createElement('div');
  gl.className = 'mouse-glow';
  document.body.appendChild(gl);

  /* hero layers */
  const hero = document.querySelector('.hero');
  const blobs = $('.hero-blobs .blob').map((el, i) => ({ el, d: [8, 14, 20][i % 3], x: 0, y: 0 }));
  const stage = document.querySelector('.orb-stage');
  const layers = $('.orb-stage [data-depth]').map((el) => ({ el, d: +el.dataset.depth, x: 0, y: 0 }));
  const st = { rx: 0, ry: 0 };
  const depths = [['Custom', 8], ['SaaS', 14], ['ERP', 20], ['SEO', 11]];
  const chips = $('.hero-chip').map((el) => {
    const hit = depths.find((a) => el.textContent.includes(a[0]));
    const o = { el, d: hit ? hit[1] : 11, x: 0, y: 0, rx: 0, ry: 0, lift: 0, hover: false };
    el.addEventListener('mouseenter', () => { o.hover = true; el.classList.add('is-hover'); kick(); });
    el.addEventListener('mouseleave', () => { o.hover = false; el.classList.remove('is-hover'); kick(); });
    return o;
  });

  /* magnetic buttons */
  const mags = $('.hero-btns .btn, .nav-cta').map((el) => ({ el, x: 0, y: 0, cx: 0, cy: 0, range: 0 }));

  /* stats shimmer */
  const stats = document.querySelector('.hero-stats');
  const sh = { x: 0, y: 0, tx: 0, ty: 0, l: 0, t: 0, on: false };
  let shine = null;
  if (stats) {
    shine = document.createElement('span');
    shine.className = 'fx-shine';
    stats.appendChild(shine);
    stats.addEventListener('mouseenter', () => { sh.on = true; stats.classList.add('is-hover'); kick(); });
    stats.addEventListener('mouseleave', () => { sh.on = false; stats.classList.remove('is-hover'); });
  }

  function measure() {                                         // all reads, batched
    mags.forEach((o) => {
      const r = o.el.getBoundingClientRect();
      o.cx = r.left + r.width / 2; o.cy = r.top + r.height / 2;
      o.range = Math.max(r.width, r.height) / 2 + 80;
    });
    if (stats) { const r = stats.getBoundingClientRect(); sh.l = r.left; sh.t = r.top; }
  }

  const go = (a, b, t) => { const v = lerp(a, b, t || 0.08); if (Math.abs(v - b) > 0.02) { busy = true; return v; } return b; };
  const f = (n) => n.toFixed(2);

  function tick() {
    raf = 0; busy = false;
    if (dirty) { measure(); dirty = false; }
    const g = gain();
    sm.nx = go(sm.nx, m.nx, 0.07); sm.ny = go(sm.ny, m.ny, 0.07);

    glow.x = lerp(glow.x, m.x, 0.12); glow.y = lerp(glow.y, m.y, 0.12);
    if (Math.abs(glow.x - m.x) > 0.3 || Math.abs(glow.y - m.y) > 0.3) busy = true;
    gl.style.transform = `translate3d(${f(glow.x)}px,${f(glow.y)}px,0)`;

    if (heroOn) {
      blobs.forEach((o) => {
        o.x = go(o.x, -sm.nx * o.d * g); o.y = go(o.y, -sm.ny * o.d * g);
        o.el.style.translate = `${f(o.x)}px ${f(o.y)}px`;
      });
      if (stage) {
        st.rx = go(st.rx, -sm.ny * 4 * g); st.ry = go(st.ry, sm.nx * 4 * g);
        stage.style.transform = `rotateX(${f(st.rx)}deg) rotateY(${f(st.ry)}deg)`;
      }
      layers.forEach((o) => {
        o.x = go(o.x, sm.nx * o.d * g); o.y = go(o.y, sm.ny * o.d * g);
        o.el.style.translate = `${f(o.x)}px ${f(o.y)}px`;
      });
      chips.forEach((o) => {
        o.x = go(o.x, sm.nx * o.d * g); o.y = go(o.y, sm.ny * o.d * g);
        o.rx = go(o.rx, -sm.ny * 3 * g); o.ry = go(o.ry, sm.nx * 3 * g);
        o.lift = go(o.lift, o.hover ? -3 : 0, 0.15);
        o.el.style.transform =
          `translate3d(${f(o.x)}px,${f(o.y + o.lift)}px,0) perspective(700px) rotateX(${f(o.rx)}deg) rotateY(${f(o.ry)}deg)`;
      });
    }

    mags.forEach((o) => {
      const dx = m.x - o.cx, dy = m.y - o.cy;
      const near = Math.hypot(dx, dy) < o.range;
      const tx = near ? clamp(dx * 0.1, -5, 5) * g : 0, ty = near ? clamp(dy * 0.1, -5, 5) * g : 0;
      o.x = go(o.x, tx, 0.14); o.y = go(o.y, ty, 0.14);
      o.el.style.translate = `${f(o.x)}px ${f(o.y)}px`;
      o.el.classList.add('fx-magnetic');
    });

    if (shine && sh.on) {
      sh.tx = m.x - sh.l; sh.ty = m.y - sh.t;
      sh.x = go(sh.x, sh.tx, 0.18); sh.y = go(sh.y, sh.ty, 0.18);
      shine.style.transform = `translate3d(${f(sh.x)}px,${f(sh.y)}px,0)`;
    }
    if (busy) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  addEventListener('mousemove', (e) => {
    m.x = e.clientX; m.y = e.clientY;
    m.nx = clamp((m.x / innerWidth - 0.5) * 2, -1, 1);
    m.ny = clamp((m.y / innerHeight - 0.5) * 2, -1, 1);
    gl.classList.add('on'); kick();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { gl.classList.remove('on'); m.nx = 0; m.ny = 0; kick(); });
  addEventListener('scroll', () => { dirty = true; kick(); }, { passive: true });
  addEventListener('resize', () => { dirty = true; kick(); });
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver((e) => { heroOn = e[0].isIntersecting; kick(); }).observe(hero);
  }
  kick();
})();
