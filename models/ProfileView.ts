import mongoose, { Schema, type Model, type Document, type Types } from "mongoose";

export interface IProfileView extends Document {
  viewer: Types.ObjectId;
  viewed: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileViewSchema = new Schema<IProfileView>(
  {
    viewer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    viewed: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

ProfileViewSchema.index({ viewer: 1, viewed: 1, createdAt: -1 });

export const ProfileView: Model<IProfileView> =
  (mongoose.models.ProfileView as Model<IProfileView>) ||
  mongoose.model<IProfileView>("ProfileView", ProfileViewSchema);
