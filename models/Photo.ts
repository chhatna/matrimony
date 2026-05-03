import mongoose, { Schema, type Model, type Document } from "mongoose";

export interface IPhoto extends Document {
  owner: mongoose.Types.ObjectId;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export const Photo: Model<IPhoto> =
  (mongoose.models.Photo as Model<IPhoto>) || mongoose.model<IPhoto>("Photo", PhotoSchema);
