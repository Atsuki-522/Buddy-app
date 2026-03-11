const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    reliabilityScore: { type: Number, default: 50 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
