const mongoose = require('mongoose');
const Session = require('../models/Session');
const SessionMember = require('../models/SessionMember');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const ReliabilityEvent = require('../models/ReliabilityEvent');
const User = require('../models/User');

let started = false;

const WINDOW_MS = 2 * 60 * 1000; // ±2分

async function upsertNotifications(docs) {
  if (!docs.length) return;
  await Promise.all(
    docs.map((doc) =>
      Notification.updateOne(
        { userId: doc.userId, sessionId: doc.sessionId, type: doc.type },
        { $setOnInsert: { ...doc, readAt: null } },
        { upsert: true }
      )
    )
  );
}

async function sendStartReminder30() {
  const now = Date.now();
  const center = now + 30 * 60 * 1000;
  const sessions = await Session.find({
    status: 'OPEN',
    startAt: { $gte: new Date(center - WINDOW_MS), $lte: new Date(center + WINDOW_MS) },
  }).lean();

  for (const session of sessions) {
    const members = await SessionMember.find({ sessionId: session._id }).lean();
    const docs = members.map((m) => ({
      userId: m.userId,
      sessionId: session._id,
      type: 'START_REMINDER_30',
      title: 'Starting soon',
      body: `"${session.title}" starts in 30 minutes`,
      meta: {
        deeplink: `/sessions/${session._id}`,
        sessionTitle: session.title,
        startAt: session.startAt,
        areaLabel: session.publicAreaLabel,
      },
    }));
    await upsertNotifications(docs);
  }
}

async function sendLateReminder10() {
  const now = Date.now();
  const center = now - 10 * 60 * 1000;
  const sessions = await Session.find({
    status: 'OPEN',
    startAt: { $gte: new Date(center - WINDOW_MS), $lte: new Date(center + WINDOW_MS) },
  }).lean();

  for (const session of sessions) {
    const members = await SessionMember.find({ sessionId: session._id }).lean();
    const checkedInUserIds = (
      await Attendance.find({
        sessionId: session._id,
        userId: { $in: members.map((m) => m.userId) },
        checkInAt: { $ne: null },
      }).lean()
    ).map((a) => String(a.userId));

    const lateMembers = members.filter((m) => !checkedInUserIds.includes(String(m.userId)));
    const docs = lateMembers.map((m) => ({
      userId: m.userId,
      sessionId: session._id,
      type: 'LATE_REMINDER_10',
      title: 'You haven\'t checked in',
      body: `"${session.title}" started 10 minutes ago but you haven't checked in`,
      meta: {
        deeplink: `/sessions/${session._id}`,
        sessionTitle: session.title,
        startAt: session.startAt,
        areaLabel: session.publicAreaLabel,
      },
    }));
    await upsertNotifications(docs);
  }
}

async function finalizeSessions() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const sessions = await Session.find({ status: 'OPEN', endAt: { $lte: cutoff } }).lean();

  for (const session of sessions) {
    const members = await SessionMember.find({ sessionId: session._id }).lean();

    const attendedUserIds = (
      await Attendance.find({
        sessionId: session._id,
        userId: { $in: members.map((m) => m.userId) },
        checkInAt: { $ne: null },
      }).lean()
    ).map((a) => String(a.userId));

    const noShowMembers = members.filter((m) => !attendedUserIds.includes(String(m.userId)));

    for (const m of noShowMembers) {
      // Attendance を NO_SHOW で upsert（checkInAt/checkOutAt は null のまま）
      const result = await Attendance.findOneAndUpdate(
        { sessionId: session._id, userId: m.userId },
        {
          $setOnInsert: {
            sessionId: session._id,
            userId: m.userId,
            checkInAt: null,
            checkOutAt: null,
          },
          $set: { status: 'NO_SHOW' },
        },
        { upsert: true, new: true }
      ).lean();

      const attendanceId = String(result._id);

      // ReliabilityEvent を冪等に作成
      const inserted = await ReliabilityEvent.updateOne(
        { _id: attendanceId },
        { $setOnInsert: { _id: attendanceId, userId: m.userId, delta: -10, reason: 'NO_SHOW' } },
        { upsert: true }
      );

      // 新規挿入の時だけスコアを更新
      if (inserted.upsertedCount > 0) {
        await User.updateOne(
          { _id: m.userId },
          [{ $set: { reliabilityScore: { $max: [0, { $add: ['$reliabilityScore', -10] }] } } }]
        );
      }
    }

    await Session.updateOne({ _id: session._id }, { status: 'DONE' });
    console.log(`Session finalized: ${session._id} (noShow=${noShowMembers.length})`);
  }
}

async function tick() {
  if (mongoose.connection.readyState !== 1) return;
  await Promise.all([sendStartReminder30(), sendLateReminder10(), finalizeSessions()]);
}

function startNotificationJobs() {
  if (started) return;
  started = true;
  setInterval(tick, 60 * 1000);
  console.log('Notification jobs started (interval: 60s)');
}

module.exports = { startNotificationJobs };
