import mongoose from "mongoose";

const { Schema } = mongoose;

const userEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["page_view", "action"], required: true },
    route: { type: String, required: true, trim: true, maxlength: 256 },
    action: { type: String, trim: true, maxlength: 64, default: "" },
    durationMs: { type: Number, min: 0, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    clientSessionId: { type: String, trim: true, maxlength: 64, default: "" },
  },
  { collection: "user_events", timestamps: true },
);

userEventSchema.index({ userId: 1, createdAt: -1 });
userEventSchema.index({ type: 1, route: 1, createdAt: -1 });
userEventSchema.index({ createdAt: -1 });

export const UserEvent =
  mongoose.models.UserEvent ?? mongoose.model("UserEvent", userEventSchema);
