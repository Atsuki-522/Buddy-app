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

module.exports = router;
