const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// დრაფტის ss_id / myhome_id განახლება
router.put('/user_draft', authMiddleware, async (req, res) => {
  try {
    const { draft_id, ss_id, myhome_id, myhome_expired_date } = req.body;
    const draft = await db.drafts.findByUserAndId(draft_id, req.user.id);
    if (!draft) return res.status(404).json({ message: 'დრაფტი ვერ მოიძებნა' });
    const fields = {};
    if (ss_id !== undefined) fields.ss_id = ss_id;
    if (myhome_id !== undefined) fields.myhome_id = myhome_id;
    if (myhome_expired_date !== undefined) fields.myhome_expired_date = myhome_expired_date;
    await db.drafts.update(draft_id, req.user.id, fields);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
