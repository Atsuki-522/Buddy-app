const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

messageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
