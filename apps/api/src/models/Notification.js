const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    type: {
      type: String,
      enum: ['START_REMINDER_30', 'LATE_REMINDER_10', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_NEW_FOR_HOST'],
      required: true,
    },
    title:  { type: String, required: true },
    body:   { type: String, required: true },
    meta: {
      deeplink:     { type: String, required: true },
      sessionTitle: { type: String },
      startAt:      { type: Date },
      areaLabel:    { type: String },
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, sessionId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Notification', notificationSchema);
