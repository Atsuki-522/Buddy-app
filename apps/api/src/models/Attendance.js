const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    sessionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    checkInAt:   { type: Date, default: null },
    checkOutAt:  { type: Date, default: null },
    status:      { type: String, enum: ['PRESENT', 'LEFT_EARLY', 'NO_SHOW'], default: 'PRESENT' },
  },
  { timestamps: true }
);

attendanceSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
