const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ყველა დრაფტი
router.get('/', authMiddleware, async (req, res) => {
  try {
    const drafts = await db.drafts.findAllByUser(req.user.id);
    res.json(drafts.map(d => ({
      id: d.id, title: d.title, source: d.source, source_url: d.source_url,
      ss_id: d.ss_id, myhome_id: d.myhome_id,
      myhome_expired_date: d.myhome_expired_date,
      created_at: d.created_at, updated_at: d.updated_at
    })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ერთი დრაფტი
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const draft = await db.drafts.findByUserAndId(Number(req.params.id), req.user.id);
    if (!draft) return res.status(404).json({ message: 'ვერ მოიძებნა' });
    draft.template = JSON.parse(draft.template || '{}');
    draft.files = JSON.parse(draft.files || '[]');
    res.json(draft);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// დრაფტის წაშლა
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await db.drafts.delete(Number(req.params.id), req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// კურსი
router.post('/currency', authMiddleware, async (req, res) => {
  try {
    await db.currency.save(req.body.usd || req.body.USD, req.body.eur || req.body.EUR);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
