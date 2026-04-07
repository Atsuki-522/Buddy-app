const router = require('express').Router();
const Session = require('../models/Session');
const SessionMember = require('../models/SessionMember');
const User = require('../models/User');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// POST /sessions
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title, goal, subject, language, venueType,
      startAt, endAt, maxPeople,
      publicLocation, publicAreaLabel,
      requiresApproval,
      privateLocation,
    } = req.body;

    if (!title || !startAt || !endAt || !publicLocation?.lng == null || !publicLocation?.lat == null) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'title, startAt, endAt, publicLocation(lng,lat) are required' } });
    }

    const sessionData = {
      hostUserId: req.user.sub,
      title, goal, subject, language, venueType,
      startAt, endAt, maxPeople,
      status: 'OPEN',
      publicAreaLabel,
      requiresApproval,
      publicLocation: {
        type: 'Point',
        coordinates: [publicLocation.lng, publicLocation.lat],
      },
    };

    if (privateLocation) {
      sessionData.privateLocation = {
        placeText: privateLocation.placeText,
        ...(privateLocation.lng != null && privateLocation.lat != null && {
          point: { type: 'Point', coordinates: [privateLocation.lng, privateLocation.lat] },
        }),
      };
    }

    const session = await Session.create(sessionData);

    await SessionMember.updateOne(
      { sessionId: session._id, userId: req.user.sub },
      { $setOnInsert: { sessionId: session._id, userId: req.user.sub, role: 'HOST', joinedAt: new Date() } },
      { upsert: true }
    );

    res.status(201).json({ session });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /sessions
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, radiusKm, startAt, startsWithinHours, startsWithinMin, limit } = req.query;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'lat and lng are required' } });
    }

    const maxDistance = radiusKm ? parseFloat(radiusKm) * 1000 : 10000;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const now = new Date();

    // Build startAt ceiling filter (startsWithinMin takes priority, then startsWithinHours)
    let startAtCeil = null;
    if (startsWithinMin) {
      startAtCeil = new Date(now.getTime() + parseFloat(startsWithinMin) * 60 * 1000);
    } else if (startsWithinHours) {
      startAtCeil = new Date(now.getTime() + parseFloat(startsWithinHours) * 60 * 60 * 1000);
    }

    const matchStage = { status: 'OPEN' };
    if (startAtCeil) matchStage.startAt = { $lte: startAtCeil };

    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distanceMeters',
          maxDistance,
          spherical: true,
          query: matchStage,
        },
      },
      { $sort: { startAt: 1 } },
      { $limit: limitNum },
      {
        $project: {
          session: '$$ROOT',
          distanceMeters: '$distanceMeters',
          _id: 0,
        },
      },
      {
        $replaceRoot: {
          newRoot: { session: '$session', distanceMeters: '$distanceMeters' },
        },
      },
    ];

    let items = await Session.aggregate(pipeline);

    // If startAt provided, sort by closest time to that target
    if (startAt) {
      const target = new Date(startAt).getTime();
      if (!isNaN(target)) {
        items = items.sort((a, b) =>
          Math.abs(new Date(a.session.startAt).getTime() - target) -
          Math.abs(new Date(b.session.startAt).getTime() - target)
        );
      }
    }

    const result = items.map(({ session, distanceMeters }) => {
      const { distanceMeters: _drop, ...rest } = session;
      return { session: rest, distanceMeters };
    });

    res.json({ items: result });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /sessions/mine?role=HOST|MEMBER
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { userId: req.user.sub };
    if (role === 'HOST' || role === 'MEMBER') filter.role = role;

    const members = await SessionMember.find(filter).lean();
    const sessionIds = members.map((m) => m.sessionId);
    const sessions = await Session.find({ _id: { $in: sessionIds } }).sort({ startAt: -1 }).lean();
    res.json({ items: sessions });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /sessions/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }

    let viewerRole = null;
    if (req.user) {
      const member = await SessionMember.findOne({
        sessionId: session._id,
        userId: req.user.sub,
      }).lean();
      if (member) viewerRole = member.role;
    }

    if (!viewerRole) {
      session.privateLocation = null;
    }

    const host = await User.findById(session.hostUserId).select('_id displayName').lean();

    res.json({ session, viewer: { role: viewerRole }, host: host ?? null });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /sessions/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    if (String(session.hostUserId) !== req.user.sub) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host can edit this session' } });
    }
    const allowed = ['title', 'goal', 'subject', 'language', 'venueType', 'startAt', 'endAt', 'maxPeople', 'publicAreaLabel', 'requiresApproval', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const updated = await Session.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    res.json({ session: updated });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// DELETE /sessions/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    if (String(session.hostUserId) !== req.user.sub) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host can delete this session' } });
    }
    await Session.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

module.exports = router;
