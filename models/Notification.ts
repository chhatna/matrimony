import mongoose, { Schema, type Model, type Document, type Types } from "mongoose";

export type NotificationType =
  | "interest_received"
  | "interest_accepted"
  | "interest_declined"
  | "message_received"
  | "profile_view";

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  fromUser?: Types.ObjectId;
  payload?: Record<string, unknown>;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["interest_received", "interest_accepted", "interest_declined", "message_received", "profile_view"],
      required: true,
    },
    fromUser: { type: Schema.Types.ObjectId, ref: "User" },
    payload: { type: Schema.Types.Mixed },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>("Notification", NotificationSchema);
