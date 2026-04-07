const router = require('express').Router({ mergeParams: true });
const Session = require('../models/Session');
const SessionMember = require('../models/SessionMember');
const JoinRequest = require('../models/JoinRequest');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

// POST /sessions/:id/join-requests
router.post('/', requireAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }
    if (session.status !== 'OPEN') {
      return res.status(409).json({ error: { code: 'SESSION_NOT_OPEN', message: 'Session is not open' } });
    }

    const existingMember = await SessionMember.findOne({
      sessionId: session._id,
      userId: req.user.sub,
    }).lean();
    if (existingMember) {
      return res.status(409).json({ error: { code: 'ALREADY_MEMBER', message: 'Already a member of this session' } });
    }

    if (session.requiresApproval) {
      const existing = await JoinRequest.findOne({ sessionId: session._id, userId: req.user.sub }).lean();
      if (existing) {
        return res.status(409).json({ error: { code: 'ALREADY_REQUESTED', message: 'Join request already exists' } });
      }
      const request = await JoinRequest.create({
        sessionId: session._id,
        userId: req.user.sub,
        message: req.body.message,
      });
      // ホストに通知
      await Notification.updateOne(
        { userId: session.hostUserId, sessionId: session._id, type: 'JOIN_REQUEST_NEW_FOR_HOST' },
        {
          $setOnInsert: {
            userId: session.hostUserId,
            sessionId: session._id,
            type: 'JOIN_REQUEST_NEW_FOR_HOST',
            title: 'New join request',
            body: `Someone requested to join "${session.title}"`,
            meta: { deeplink: `/sessions/${session._id}`, sessionTitle: session.title },
            readAt: null,
          },
        },
        { upsert: true }
      );
      return res.status(201).json({ request });
    }

    // requiresApproval=false → 即入会
    await SessionMember.updateOne(
      { sessionId: session._id, userId: req.user.sub },
      { $setOnInsert: { sessionId: session._id, userId: req.user.sub, role: 'MEMBER', joinedAt: new Date() } },
      { upsert: true }
    );
    res.status(201).json({ joined: true });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /sessions/:id/join-requests
router.get('/', requireAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    const isHost =
      String(session.hostUserId) === String(req.user.sub) ||
      !!(await SessionMember.findOne({ sessionId: session._id, userId: req.user.sub, role: 'HOST' }).lean());

    if (!isHost) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host can view join requests' } });
    }

    const status = req.query.status || 'PENDING';
    const items = await JoinRequest.find({ sessionId: session._id, status })
      .populate('userId', '_id displayName')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;
