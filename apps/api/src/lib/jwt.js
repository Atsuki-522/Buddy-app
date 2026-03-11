const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('WARNING: JWT_SECRET is not set. Auth endpoints will throw at runtime.');
  }
  return secret;
}

const SECRET = getSecret();

const sign = (payload) => {
  if (!SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
};

const verify = (token) => {
  if (!SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.verify(token, SECRET);
};

module.exports = { sign, verify };
