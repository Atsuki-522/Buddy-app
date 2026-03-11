const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    status:    { type: String, enum: ['PENDING', 'APPROVED', 'DENIED', 'CANCELLED'], default: 'PENDING' },
    message:   { type: String },
  },
  { timestamps: true }
);

joinRequestSchema.index({ sessionId: 1, status: 1 });
joinRequestSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
