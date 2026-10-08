(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
  const date = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const STATUS = { 'In Progress': 's-p', Review: 's-r', Completed: 's-c', 'On Hold': 's-h', Planning: 's-l' };
  const TYPES = ['Business Website', 'E-commerce', 'Portfolio', 'Landing Page', 'College ERP', 'SaaS Platform', 'Web Application', 'Other'];
  const CATS = ['Frontend', 'Backend', 'Database', 'Language', 'Tool', 'Hosting', 'Other'];
  let D = { clients: [], languages: [], services: [], inquiries: [] };
  let view = 'dashboard', q = '', tab = 'All';

  async function api(method, url, body) {
    const r = await fetch('/api/admin' + url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { location.reload(); throw new Error('Signed out'); }
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Something went wrong');
    return j;
  }
  const load = async () => { D = await api('GET', '/data'); render(); };

  /* ---------- pieces ---------- */
  const filtered = () => D.clients.filter((c) => (tab === 'All' || c.status === tab) &&
    (!q || (c.name + ' ' + c.website + ' ' + c.type).toLowerCase().includes(q)));
  const table = (list, cols) => list.length
    ? `<div class="tbl"><table class="rt"><thead><tr>${cols.map((c) => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${list.map((r) =>
        `<tr>${cols.map((c) => `<td data-l="${c[0]}">${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : '<div class="empty">Nothing here yet.</div>';
  const clientCols = [
    ['Client', (c) => `<b>${esc(c.name)}</b> ${c.show ? '<span class="pill s-c">On site</span>' : ''}<small>${esc((c.website || '').replace(/^https?:\/\//, ''))}</small>`],
    ['Type', (c) => esc(c.type)],
    ['Status', (c) => `<span class="pill ${STATUS[c.status] || 's-l'}">${esc(c.status || 'Planning')}</span>`],
    ['Start', (c) => date(c.start)], ['End', (c) => date(c.end)], ['Price', (c) => money(c.price)],
    ['Progress', (c) => `${c.progress || 0}%<div class="bar"><i style="width:${c.progress || 0}%"></i></div>`],
    ['', (c) => `<div class="acts"><button class="btn sm ghost" data-act="edit" data-id="${c.id}">Edit</button><button class="btn sm danger" data-act="del" data-col="clients" data-id="${c.id}">Delete</button></div>`],
  ];
  const tabs = () => `<div class="tabs">${['All', 'In Progress', 'Review', 'Completed', 'On Hold', 'Planning'].map((t) =>
    `<button class="${t === tab ? 'on' : ''}" data-act="tab" data-t="${t}">${t}${t === 'All' ? ` (${D.clients.length})` : ''}</button>`).join('')}</div>`;
  const chips = (list, col, sub) => list.length ? `<div class="chips">${list.map((r) =>
    `<span class="chip">${esc(r.name)}${r[sub] ? `<em>${esc(r[sub])}</em>` : ''}<button data-act="del" data-col="${col}" data-id="${r.id}" aria-label="Remove">×</button></span>`).join('')}</div>` : '<div class="empty">None added yet.</div>';

  /* ---------- views ---------- */
  const V = {
    dashboard() {
      const cs = D.clients, done = cs.filter((c) => c.status === 'Completed');
      const stat = (ic, bg, n, l) => `<div class="stat"><div class="ic" style="background:${bg}">${ic}</div><div><b>${n}</b><span>${l}</span></div></div>`;
      const due = cs.filter((c) => c.status !== 'Completed' && c.end).sort((a, b) => a.end.localeCompare(b.end)).slice(0, 5);
      const h = new Date().getHours(), g = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      return `<div class="head"><div><h1>Good ${g}, Heet! 👋</h1><p>Here's an overview of your clients and projects.</p></div><button class="btn" data-act="add">＋ Add Client</button></div>
      <div class="stats">${stat('👥', '#f1e8ff', cs.length, 'Total Clients')}${stat('📁', '#e3f2ff', cs.filter((c) => ['In Progress', 'Review'].includes(c.status)).length, 'Active Projects')}
      ${stat('✅', '#e3f8ef', done.length, 'Completed')}${stat('₹', '#fff1e4', money(done.reduce((s, c) => s + (c.price || 0), 0)).slice(1), 'Revenue (completed)')}</div>
      <div class="grid"><div><div class="card"><h2>Clients</h2>${tabs()}${table(filtered().slice(0, 8), clientCols)}</div></div>
      <div><div class="card"><h2>Upcoming Deadlines</h2>${due.length ? due.map((c) => `<div class="dl"><span class="dot" style="background:${c.status === 'Review' ? '#ff7a2f' : '#7c3aed'}"></span><div><b>${esc(c.name)}</b><small>${esc(c.type)}</small></div><em>${date(c.end)}</em></div>`).join('') : '<div class="empty">No deadlines.</div>'}</div>
      <div class="card"><h2>Languages &amp; Tech <button class="btn sm ghost" data-view="languages">Manage</button></h2>${chips(D.languages, 'languages', 'category')}</div>
      <div class="card"><h2>Services <button class="btn sm ghost" data-view="services">Manage</button></h2>${chips(D.services, 'services')}</div></div></div>`;
    },
    clients() {
      return `<div class="head"><div><h1>Clients</h1><p>Add a website here and tick “Show on website” to list it under Work Experience.</p></div><button class="btn" data-act="add">＋ Add Client</button></div>
      <div class="card">${tabs()}${table(filtered(), clientCols)}</div>`;
    },
    languages() {
      return `<div class="head"><div><h1>Languages &amp; Tech</h1><p>Your master list. Pick these for each website in Clients → Add / Edit — they then show on that website's detail page.</p></div></div>
      <div class="card"><h2>Add a language / technology</h2><form class="row" data-form="languages">
      <div class="field"><label>Name</label><input name="name" placeholder="e.g. TypeScript" required></div>
      <div class="field"><label>Category</label><select name="category">${CATS.map((c) => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Note (optional)</label><input name="note" placeholder="e.g. used for all SaaS builds"></div><button class="btn">Add</button></form>
      ${D.languages.length ? D.languages.map((l) => `<div class="item"><div><b>${esc(l.name)}</b> <span class="chip">${esc(l.category)}</span>${l.note ? `<p>${esc(l.note)}</p>` : ''}</div><button class="btn sm danger" data-act="del" data-col="languages" data-id="${l.id}">Remove</button></div>`).join('') : '<div class="empty">None added yet.</div>'}</div>`;
    },
    services() {
      return `<div class="head"><div><h1>Services</h1><p>Your master list. Pick these for each website in Clients → Add / Edit — they then show on that website's detail page.</p></div></div>
      <div class="card"><h2>Add a service</h2><form class="row" data-form="services">
      <div class="field"><label>Service</label><input name="name" placeholder="e.g. SEO Optimization" required></div>
      <div class="field"><label>Description (optional)</label><input name="description" placeholder="Short description"></div><button class="btn">Add</button></form>
      ${D.services.length ? D.services.map((s) => `<div class="item"><div><b>${esc(s.name)}</b>${s.description ? `<p>${esc(s.description)}</p>` : ''}</div><button class="btn sm danger" data-act="del" data-col="services" data-id="${s.id}">Remove</button></div>`).join('') : '<div class="empty">None added yet.</div>'}</div>`;
    },
    inquiries() {
      return `<div class="head"><div><h1>Inquiries</h1><p>Messages from the website contact form.</p></div></div><div class="card">${D.inquiries.length ? D.inquiries.map((i) =>
        `<div class="item"><div><b>${esc(i.name)}</b> <span class="pill ${i.source === 'chatbot' ? 's-r' : 's-p'}">${i.source === 'chatbot' ? 'Chatbot' : 'Contact form'}</span> <small>${date(i.createdAt)}</small><p>${[i.phone && '📱 ' + i.phone, i.email, i.company, i.project_type, i.budget].filter(Boolean).map(esc).join(' · ') || 'No contact details given'}</p>${i.details ? `<p>${esc(i.details)}</p>` : ''}</div><button class="btn sm danger" data-act="del" data-col="inquiries" data-id="${i.id}">Delete</button></div>`).join('') : '<div class="empty">No inquiries yet.</div>'}</div>`;
    },
  };
  function render() {
    $('#view').innerHTML = V[view]();
    document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
    $('#side').classList.remove('open'); $('#scrim').classList.remove('open');
  }
  const go = (v) => { view = v; render(); scrollTo(0, 0); };

  /* ---------- client dialog ---------- */
  function openDialog(id) {
    const c = D.clients.find((x) => x.id === id) || { status: 'Planning', progress: 0, price: '', show: true, tech: [], services: [] };
    const f = (l, n, t = 'text', v = c[n] ?? '', x = '', cls = '') => `<div class="field ${cls}"><label>${l}</label><input type="${t}" name="${n}" value="${esc(v)}" ${x}></div>`;
    const sel = (l, n, opts) => `<div class="field"><label>${l}</label><select name="${n}">${opts.map((o) => `<option ${o === c[n] ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
    const pick = (l, n, all, chosen) => `<div class="field full"><label>${l}</label><div class="pick">${[...new Set([...all, ...chosen])].map((v) =>
      `<label><input type="checkbox" name="${n}" value="${esc(v)}" ${chosen.includes(v) ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>
      <input name="${n}_new" placeholder="Add new (comma separated)"></div>`;
    $('#dform').dataset.id = id || '';
    $('#dform').innerHTML = `<h2>${id ? 'Edit' : 'Add'} Client / Website</h2><div class="two">${f('Client / business name', 'name', 'text', c.name ?? '', 'required')}${f('Website URL', 'website')}
      ${sel('Project type', 'type', TYPES)}${sel('Status', 'status', Object.keys(STATUS))}${f('Start date', 'start', 'date')}${f('End date', 'end', 'date')}
      ${f('Price (₹) — private', 'price', 'number', c.price, 'min="0"')}${f('Progress (%)', 'progress', 'number', c.progress, 'min="0" max="100"')}
      <div class="field full"><label>Description (shown on website)</label><textarea name="description" rows="3" maxlength="600">${esc(c.description ?? '')}</textarea></div>
      ${f('Screenshot / image URL (optional)', 'image', 'text', c.image ?? '', 'placeholder="https://…/screenshot.jpg"', 'full')}
      ${pick('Languages & Tech used', 'tech', D.languages.map((l) => l.name), c.tech || [])}${pick('Services provided', 'services', D.services.map((s) => s.name), c.services || [])}
      <label class="check full"><input type="checkbox" name="show" ${c.show ? 'checked' : ''}> Show on website (Work Experience)</label></div>
      <div class="err" id="derr"></div><div class="dact"><button type="button" class="btn ghost" data-act="close">Cancel</button><button class="btn">Save</button></div>`;
    $('#dlg').showModal();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act],[data-view]'); if (!el) return;
    if (el.dataset.view) return go(el.dataset.view);
    const { act, id, col } = el.dataset;
    if (act === 'add') openDialog();
    else if (act === 'edit') openDialog(id);
    else if (act === 'close') $('#dlg').close();
    else if (act === 'tab') { tab = el.dataset.t; render(); }
    else if (act === 'del' && confirm('Delete this item?')) { try { await api('DELETE', `/${col}/${id}`); await load(); } catch (er) { alert(er.message); } }
  });
  document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target, fd = new FormData(form), body = Object.fromEntries(fd);
    if (form.id === 'dform') {
      const split = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
      body.tech = [...fd.getAll('tech'), ...split(fd.get('tech_new'))];
      body.services = [...fd.getAll('services'), ...split(fd.get('services_new'))];
      body.show = form.elements.show.checked;
    }
    try {
      if (form.id === 'dform') {
        const id = form.dataset.id; await api(id ? 'PUT' : 'POST', id ? `/clients/${id}` : '/clients', body); $('#dlg').close();
      } else if (form.dataset.form) { await api('POST', '/' + form.dataset.form, body); form.reset(); }
      await load();
    } catch (er) { const box = $('#derr'); box && form.id === 'dform' ? (box.textContent = er.message) : alert(er.message); }
  });
  $('#q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); if (view !== 'clients' && view !== 'dashboard') view = 'clients'; render(); });
  $('#menu').addEventListener('click', () => { $('#side').classList.toggle('open'); $('#scrim').classList.toggle('open'); });
  $('#scrim').addEventListener('click', () => { $('#side').classList.remove('open'); $('#scrim').classList.remove('open'); });
  $('#logout').addEventListener('click', async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.replace('/admin'); });
  load();
})();
