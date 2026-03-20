const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { authMiddleware } = require('../middleware/auth');

router.get('/*', authMiddleware, async (req, res) => {
  const imageUrl = req.params[0];
  if (!imageUrl) return res.status(400).json({ message: 'URL არ არის' });

  const fullUrl = imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`;

  try {
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://home.ss.ge/'
      }
    });

    if (!response.ok) return res.status(404).json({ message: 'სურათი ვერ მოიძებნა' });

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    response.body.pipe(res);
  } catch (e) {
    res.status(500).json({ message: 'სურათის ჩამოტვირთვა ვერ მოხდა' });
  }
});

module.exports = router;
