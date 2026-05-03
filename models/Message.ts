import mongoose, { Schema, type Model, type Document, type Types } from "mongoose";

export interface IMessage extends Document {
  conversationKey: string; // sorted "userIdA:userIdB"
  from: Types.ObjectId;
  to: Types.ObjectId;
  body: string;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationKey: { type: String, required: true, index: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, maxlength: 4000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export function makeConversationKey(a: string, b: string): string {
  return [String(a), String(b)].sort().join(":");
}

export const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>("Message", MessageSchema);
