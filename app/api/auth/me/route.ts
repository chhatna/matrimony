import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Interest } from "@/models/Interest";
import { Message } from "@/models/Message";
import { Notification } from "@/models/Notification";
import { ProfileView } from "@/models/ProfileView";
import { Shortlist } from "@/models/Shortlist";
import { getSession } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    const session = getSession();
    if (!session) return ok({ user: null });
    await connectDB();
    const user = await User.findById(session.uid);
    if (!user) return ok({ user: null });
    return ok({ user: user.toPublicJSON() });
  });
}

export async function DELETE() {
  return handle(async () => {
    const session = getSession();
    if (!session) return fail("Not authenticated", 401);
    await connectDB();
    // Cascade-delete user-related data so nothing is orphaned
    await Promise.all([
      Interest.deleteMany({ $or: [{ from: session.uid }, { to: session.uid }] }),
      Message.deleteMany({ $or: [{ from: session.uid }, { to: session.uid }] }),
      Notification.deleteMany({ $or: [{ user: session.uid }, { fromUser: session.uid }] }),
      ProfileView.deleteMany({ $or: [{ viewer: session.uid }, { viewed: session.uid }] }),
      Shortlist.deleteMany({ $or: [{ owner: session.uid }, { target: session.uid }] }),
    ]);
    await User.findByIdAndDelete(session.uid);
    const res = ok({ deleted: true });
    res.cookies.set("mt_token", "", { path: "/", maxAge: 0 });
    return res;
  });
}
