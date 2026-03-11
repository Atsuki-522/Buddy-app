const mongoose = require('mongoose');

const reliabilityEventSchema = new mongoose.Schema(
  {
    _id:       { type: String },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    delta:     { type: Number, required: true },
    reason:    { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false }
);

reliabilityEventSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ReliabilityEvent', reliabilityEventSchema);
