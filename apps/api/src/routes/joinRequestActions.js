const router = require('express').Router();
const Session = require('../models/Session');
const SessionMember = require('../models/SessionMember');
const JoinRequest = require('../models/JoinRequest');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

async function assertHost(session, userId) {
  if (String(session.hostUserId) === String(userId)) return true;
  return !!(await SessionMember.findOne({ sessionId: session._id, userId, role: 'HOST' }).lean());
}

// PATCH /join-requests/:rid/approve
router.patch('/:rid/approve', requireAuth, async (req, res) => {
  try {
    const jr = await JoinRequest.findById(req.params.rid).lean();
    if (!jr) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'JoinRequest not found' } });

    const session = await Session.findById(jr.sessionId).lean();
    if (!await assertHost(session, req.user.sub)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host can approve' } });
    }

    const updated = await JoinRequest.findByIdAndUpdate(
      jr._id,
      { status: 'APPROVED' },
      { new: true }
    ).lean();

    await SessionMember.updateOne(
      { sessionId: jr.sessionId, userId: jr.userId },
      { $setOnInsert: { sessionId: jr.sessionId, userId: jr.userId, role: 'MEMBER', joinedAt: new Date() } },
      { upsert: true }
    );

    // 申請者に通知
    await Notification.updateOne(
      { userId: jr.userId, sessionId: jr.sessionId, type: 'JOIN_REQUEST_APPROVED' },
      {
        $setOnInsert: {
          userId: jr.userId,
          sessionId: jr.sessionId,
          type: 'JOIN_REQUEST_APPROVED',
          title: '参加が承認されました',
          body: `「${session.title}」への参加が承認されました`,
          meta: { deeplink: `/sessions/${jr.sessionId}`, sessionTitle: session.title },
          readAt: null,
        },
      },
      { upsert: true }
    );

    res.json({ request: updated });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /join-requests/:rid/deny
router.patch('/:rid/deny', requireAuth, async (req, res) => {
  try {
    const jr = await JoinRequest.findById(req.params.rid).lean();
    if (!jr) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'JoinRequest not found' } });

    const session = await Session.findById(jr.sessionId).lean();
    if (!await assertHost(session, req.user.sub)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host can deny' } });
    }

    const updated = await JoinRequest.findByIdAndUpdate(
      jr._id,
      { status: 'DENIED' },
      { new: true }
    ).lean();

    res.json({ request: updated });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /join-requests/:rid/cancel
router.patch('/:rid/cancel', requireAuth, async (req, res) => {
  try {
    const jr = await JoinRequest.findById(req.params.rid).lean();
    if (!jr) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'JoinRequest not found' } });

    if (String(jr.userId) !== String(req.user.sub)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the applicant can cancel' } });
    }

    const updated = await JoinRequest.findByIdAndUpdate(
      jr._id,
      { status: 'CANCELLED' },
      { new: true }
    ).lean();

    res.json({ request: updated });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;
