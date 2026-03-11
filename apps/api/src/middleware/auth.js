const { verify } = require('../lib/jwt');

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

const requireAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token required' } });
  }
  try {
    req.user = verify(token);
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token invalid or expired' } });
  }
};

const optionalAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = verify(token);
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { requireAuth, optionalAuth };
