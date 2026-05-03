import mongoose, { Schema, type Model, type Document, type Types } from "mongoose";

export interface IShortlist extends Document {
  owner: Types.ObjectId;
  target: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShortlistSchema = new Schema<IShortlist>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    target: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

ShortlistSchema.index({ owner: 1, target: 1 }, { unique: true });

export const Shortlist: Model<IShortlist> =
  (mongoose.models.Shortlist as Model<IShortlist>) ||
  mongoose.model<IShortlist>("Shortlist", ShortlistSchema);
