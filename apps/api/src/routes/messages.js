const express = require('express');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const SessionMember = require('../models/SessionMember');
const Message = require('../models/Message');

async function requireMember(req, res, next) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
  }
  const member = await SessionMember.findOne({ sessionId: id, userId: req.user.sub });
  if (!member) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Members only' } });
  }
  next();
}

// GET /sessions/:id/messages
router.get('/messages', requireAuth, requireMember, async (req, res) => {
  try {
    const messages = await Message.find({ sessionId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('userId', 'displayName');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
});

// POST /sessions/:id/messages
router.post('/messages', requireAuth, requireMember, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'text is required' } });
    }
    const message = await Message.create({
      sessionId: req.params.id,
      userId: req.user.sub,
      text: text.trim(),
    });
    await message.populate('userId', 'displayName');
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
});

module.exports = router;
