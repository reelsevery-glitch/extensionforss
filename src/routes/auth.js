const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { signToken } = require('../middleware/auth');

// SS.GE session-ით login
router.post('/broker_login_pin', async (req, res) => {
  try {
    const { ss_sub } = req.body;
    const user = await db.users.findBySub(ss_sub);
    if (!user) return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    const token = signToken({ id: user.id, phone: user.phone });
    const roles = JSON.parse(user.roles || '["USER"]');
    res.json({ accessToken: token, user: { id: user.id, name: user.name, phone: user.phone, roles } });
  } catch (e) {
    res.status(500).json({ message: 'სერვერის შეცდომა' });
  }
});

// პირველი შესვლა — რეგისტრაცია
router.post('/broker_registration', async (req, res) => {
  try {
    const { ss_sub, ss_pin, ss_phone, ss_name } = req.body;
    const existing = await db.users.findBySub(ss_sub);
    if (existing) {
      // უკვე არსებობს — token დავაბრუნოთ
      const token = signToken({ id: existing.id, phone: existing.phone });
      const roles = JSON.parse(existing.roles || '["USER"]');
      return res.json({ accessToken: token, user: { id: existing.id, name: existing.name, phone: existing.phone, roles } });
    }
    const user = await db.users.create({
      name: ss_name,
      phone: String(ss_phone),
      ss_sub,
      ss_pin,
      roles: ['USER']
    });
    const token = signToken({ id: user.id, phone: user.phone });
    res.json({ accessToken: token, user: { id: user.id, name: user.name, phone: user.phone, roles: ['USER'] } });
  } catch (e) {
    res.status(500).json({ message: 'სერვერის შეცდომა: ' + e.message });
  }
});

// ტოკენის განახლება
router.post('/login/access-token', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['refreshtoken'];
  if (!token) return res.status(401).json({ message: 'ტოკენი არ არის' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'myestate-secret-key-2025');
    const user = await db.users.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'მომხმარებელი ვერ მოიძებნა' });
    const newToken = signToken({ id: user.id, phone: user.phone });
    const roles = JSON.parse(user.roles || '["USER"]');
    res.json({ accessToken: newToken, user: { id: user.id, name: user.name, phone: user.phone, roles } });
  } catch (e) {
    res.status(401).json({ message: 'ტოკენი ვადაგასულია' });
  }
});

module.exports = router;
