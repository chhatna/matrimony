import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/models/Notification";
import { handle, ok, requireSession } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const session = requireSession();
    await connectDB();
    const items = await Notification.find({ user: session.uid })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("fromUser", "fullName photos");
    const unread = await Notification.countDocuments({ user: session.uid, readAt: null });
    return ok({ items, unread });
  });
}

export async function POST() {
  return handle(async () => {
    const session = requireSession();
    await connectDB();
    await Notification.updateMany(
      { user: session.uid, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return ok({ ok: true });
  });
}
