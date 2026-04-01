const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sign } = require('../lib/jwt');
const { requireAuth } = require('../middleware/auth');

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'email, password, displayName are required' } });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, displayName });
    const token = sign({ sub: user._id, email: user.email });
    res.status(201).json({ token, user: { id: user._id, email: user.email, displayName: user.displayName, reliabilityScore: user.reliabilityScore } });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'email and password are required' } });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } });
    }
    const token = sign({ sub: user._id, email: user.email });
    res.json({ token, user: { id: user._id, email: user.email, displayName: user.displayName, reliabilityScore: user.reliabilityScore } });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /auth/profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    const update = {};
    if (photoUrl !== undefined) update.photoUrl = photoUrl;
    const user = await User.findByIdAndUpdate(req.user.sub, { $set: update }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('-passwordHash');
    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;
