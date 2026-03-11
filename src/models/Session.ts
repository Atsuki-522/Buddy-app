import mongoose, { Schema, models, model } from "mongoose";

const PointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const SessionSchema = new Schema(
  {
    hostId: { type: String, required: true }, // Auth入れるまでは仮でOK
    goal: { type: String, required: true },
    category: { type: String, default: "" },

    startAt: { type: Date, required: true },
    durationMin: { type: Number, required: true },
    capacity: { type: Number, required: true },

    rules: { type: [String], default: [] },

    location: { type: PointSchema, required: true },

    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

// nearby検索用（後で使う）
SessionSchema.index({ location: "2dsphere" });

export const Session = models.Session || model("Session", SessionSchema);
