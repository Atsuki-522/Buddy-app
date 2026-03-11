const router = require('express').Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

// GET /notifications/unread-count  ※ /:id より先に定義
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.sub, readAt: null });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const { unreadOnly, limit, before } = req.query;
    const limitNum = Math.min(parseInt(limit) || 30, 100);

    const filter = { userId: req.user.sub };
    if (unreadOnly === 'true') filter.readAt = null;
    if (before) filter.createdAt = { $lt: new Date(before) };

    const items = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.sub,
    }).lean();

    if (!notification) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }

    await Notification.updateOne({ _id: notification._id }, { readAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;
