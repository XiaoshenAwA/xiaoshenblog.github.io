const crypto = require('crypto');
const config = require('../config');

function adminAuth(req, res, next) {
  const adminPassword = config.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const tokenBuf = Buffer.from(token, 'utf8');
    const passwordBuf = Buffer.from(adminPassword, 'utf8');
    if (tokenBuf.length !== passwordBuf.length || !crypto.timingSafeEqual(tokenBuf, passwordBuf)) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    return res.status(403).json({ error: 'Invalid credentials' });
  }
  next();
}

module.exports = adminAuth;
