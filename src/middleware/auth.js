const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'myestate-secret-key-2025';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'ტოკენი არ არის' });

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'ტოკენი არასწორია ან ვადაგასულია' });
  }
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { authMiddleware, signToken };
