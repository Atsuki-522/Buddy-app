const mongoose = require('mongoose');

const sessionMemberSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  role:      { type: String, enum: ['HOST', 'MEMBER'], default: 'MEMBER' },
  joinedAt:  { type: Date, default: Date.now },
});

sessionMemberSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('SessionMember', sessionMemberSchema);
