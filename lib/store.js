// Tiny JSON-file store (no extra dependencies). Swap for a real DB when you scale.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = path.join(__dirname, '..', 'data', 'db.json');
const seed = () => ({
  clients: [
    { id: crypto.randomUUID(), createdAt: new Date().toISOString(), name: 'Natura — Botanical Skincare', website: '/work/natura/',
      type: 'E-commerce', status: 'Completed', show: true, progress: 100,
      description: 'A premium botanical-skincare storefront with an interactive 3D product viewer, animated scroll reveals and a full shopping flow.',
      tech: ['HTML5', 'CSS3', 'JavaScript', 'Three.js'], services: ['E-Commerce', 'Portfolio & Creative Sites'] },
  ],
  inquiries: [],
  languages: ['React:Frontend', 'Next.js:Frontend', 'Tailwind CSS:Frontend', 'Node.js:Backend', 'Express:Backend', 'MongoDB:Database', 'PostgreSQL:Database']
    .map((s) => ({ id: crypto.randomUUID(), name: s.split(':')[0], category: s.split(':')[1], note: '' })),
  services: ['Business Websites', 'E-Commerce', 'SaaS Platforms', 'Web Applications', 'Custom Software', 'Admin Dashboards']
    .map((n) => ({ id: crypto.randomUUID(), name: n, description: '' })),
});

let db;
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { db = seed(); save(); }

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

module.exports = {
  all: () => db,
  list: (c) => db[c] || (db[c] = []),
  add(c, obj) { const row = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...obj }; this.list(c).unshift(row); save(); return row; },
  update(c, id, patch) { const row = this.list(c).find((r) => r.id === id); if (!row) return null; Object.assign(row, patch); save(); return row; },
  remove(c, id) { const l = this.list(c); const i = l.findIndex((r) => r.id === id); if (i < 0) return false; l.splice(i, 1); save(); return true; },
};
