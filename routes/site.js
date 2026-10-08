// Public, read-only data for the website (only what the admin marked "Show on website").
const express = require('express');
const store = require('../lib/store');
const router = express.Router();
router.get('/', (req, res) => {
  const d = store.all();
  res.set('Cache-Control', 'no-cache');
  res.json({
    works: d.clients.filter((c) => c.show).map((c) => ({ id: c.id, name: c.name, website: c.website || '', type: c.type || '', description: c.description || '',
      image: c.image || '', tech: c.tech || [], services: c.services || [] })),
    languages: d.languages.map((l) => l.name),
    services: d.services.map((s) => s.name),
  });
});
module.exports = router;
