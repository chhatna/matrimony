import mongoose, { Schema, type Model, type Document, type Types } from "mongoose";

export type InterestStatus = "pending" | "accepted" | "declined" | "withdrawn";

export interface IInterest extends Document {
  from: Types.ObjectId;
  to: Types.ObjectId;
  status: InterestStatus;
  message?: string;
  respondedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InterestSchema = new Schema<IInterest>(
  {
    from: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "withdrawn"],
      default: "pending",
      index: true,
    },
    message: { type: String, maxlength: 500 },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InterestSchema.index({ from: 1, to: 1 }, { unique: true });

export const Interest: Model<IInterest> =
  (mongoose.models.Interest as Model<IInterest>) ||
  mongoose.model<IInterest>("Interest", InterestSchema);
