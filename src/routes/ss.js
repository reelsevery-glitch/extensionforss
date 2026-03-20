const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { scrape_ss } = require('../services/scraper_ss');

router.post('/save', authMiddleware, async (req, res) => {
  const { url } = req.body;
  const user_id = req.user.id;
  if (!url || !url.includes('home.ss.ge')) return res.status(400).json({ message: 'SS.GE-ს URL არ არის სწორი' });
  try {
    const scraped = await scrape_ss(url);
    if (!scraped) return res.status(400).json({ message: 'განცხადება ვერ მოიძებნა' });
    const existing = await db.drafts.findByUserAndUrl(user_id, url);
    if (existing) {
      await db.drafts.update(existing.id, user_id, {
        template: JSON.stringify(scraped.template),
        files: JSON.stringify(scraped.files),
        title: scraped.title
      });
      return res.json({ id: existing.id });
    }
    const draft = await db.drafts.create({
      user_id, title: scraped.title, source: 'ss', source_url: url,
      template: JSON.stringify(scraped.template), files: JSON.stringify(scraped.files)
    });
    res.json({ id: draft.id });
  } catch (e) {
    res.status(500).json({ message: 'შეცდომა: ' + e.message });
  }
});

router.get('/template/:id', authMiddleware, async (req, res) => {
  try {
    const draft = await db.drafts.findByUserAndId(Number(req.params.id), req.user.id);
    if (!draft) return res.status(404).json({ message: 'დრაფტი ვერ მოიძებნა' });
    res.json({ template: JSON.parse(draft.template || '{}'), files: JSON.parse(draft.files || '[]') });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
