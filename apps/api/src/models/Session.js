const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    goal: { type: String },
    subject: { type: String },
    language: { type: String },
    venueType: { type: String },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    maxPeople: { type: Number },
    status: { type: String, enum: ['OPEN', 'CANCELLED', 'DONE'], default: 'OPEN' },
    requiresApproval: { type: Boolean, default: true },
    publicAreaLabel: { type: String },
    publicLocation: { type: geoPointSchema, required: true },
    privateLocation: {
      placeText: { type: String },
      point: { type: geoPointSchema },
    },
  },
  { timestamps: true }
);

sessionSchema.index({ publicLocation: '2dsphere' });
sessionSchema.index({ status: 1, startAt: 1 });

module.exports = mongoose.model('Session', sessionSchema);
