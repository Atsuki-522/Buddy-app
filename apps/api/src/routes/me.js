const router = require('express').Router();
const Session = require('../models/Session');
const SessionMember = require('../models/SessionMember');
const JoinRequest = require('../models/JoinRequest');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// GET /me/incoming-requests
router.get('/incoming-requests', requireAuth, async (req, res) => {
  try {
    const hostedMembers = await SessionMember.find({ userId: req.user.sub, role: 'HOST' }).lean();
    const sessionIds = hostedMembers.map((m) => m.sessionId);

    const requests = await JoinRequest.find({ sessionId: { $in: sessionIds }, status: 'PENDING' })
      .sort({ createdAt: -1 })
      .lean();

    const sessions = await Session.find({ _id: { $in: sessionIds } }).lean();
    const sessionMap = Object.fromEntries(sessions.map((s) => [String(s._id), s]));

    const userIds = [...new Set(requests.map((r) => String(r.userId)))];
    const users = await User.find({ _id: { $in: userIds } }).select('displayName').lean();
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const items = requests.map((r) => ({
      ...r,
      session: sessionMap[String(r.sessionId)] ?? null,
      requester: userMap[String(r.userId)] ?? null,
    }));

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /me/history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const now = new Date();

    const hostedMembers = await SessionMember.find({ userId: req.user.sub, role: 'HOST' }).lean();
    const hostedIds = hostedMembers.map((m) => m.sessionId);
    const hostedPast = await Session.find({ _id: { $in: hostedIds }, endAt: { $lt: now } })
      .sort({ endAt: -1 })
      .lean();

    const joinedMembers = await SessionMember.find({ userId: req.user.sub, role: 'MEMBER' }).lean();
    const joinedIds = joinedMembers.map((m) => m.sessionId);
    const joinedPast = await Session.find({ _id: { $in: joinedIds }, endAt: { $lt: now } })
      .sort({ endAt: -1 })
      .lean();

    res.json({ hostedPast, joinedPast });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;
