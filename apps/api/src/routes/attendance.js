const router = require('express').Router({ mergeParams: true });
const SessionMember = require('../models/SessionMember');
const Attendance = require('../models/Attendance');
const { requireAuth } = require('../middleware/auth');

// POST /sessions/:id/check-in
router.post('/check-in', requireAuth, async (req, res) => {
  try {
    const member = await SessionMember.findOne({
      sessionId: req.params.id,
      userId: req.user.sub,
    }).lean();
    if (!member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a member of this session' } });
    }

    const now = new Date();
    const attendance = await Attendance.findOneAndUpdate(
      { sessionId: req.params.id, userId: req.user.sub },
      { $setOnInsert: { sessionId: req.params.id, userId: req.user.sub }, $set: { checkInAt: now } },
      { upsert: true, new: true }
    ).lean();

    res.status(200).json({ attendance });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /sessions/:id/check-out
router.post('/check-out', requireAuth, async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      sessionId: req.params.id,
      userId: req.user.sub,
    }).lean();

    if (!attendance || !attendance.checkInAt) {
      return res.status(400).json({ error: { code: 'NOT_CHECKED_IN', message: 'Must check in before checking out' } });
    }

    const updated = await Attendance.findByIdAndUpdate(
      attendance._id,
      { checkOutAt: new Date() },
      { new: true }
    ).lean();

    res.json({ attendance: updated });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;
