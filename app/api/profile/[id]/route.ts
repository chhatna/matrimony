import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ProfileView } from "@/models/ProfileView";
import { Notification } from "@/models/Notification";
import { Interest } from "@/models/Interest";
import { handle, ok, fail, requireSession } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  return handle(async () => {
    const session = requireSession();
    await connectDB();
    const user = await User.findById(ctx.params.id);
    if (!user) return fail("Profile not found", 404);

    if (String(user._id) !== session.uid) {
      await ProfileView.create({ viewer: session.uid, viewed: user._id }).catch(() => null);
      await Notification.create({
        user: user._id,
        type: "profile_view",
        fromUser: session.uid,
      }).catch(() => null);
    }

    const interest = await Interest.findOne({
      $or: [
        { from: session.uid, to: user._id },
        { from: user._id, to: session.uid },
      ],
    });

    return ok({
      user: user.toPublicJSON(),
      interest: interest
        ? {
            id: String(interest._id),
            status: interest.status,
            iSent: String(interest.from) === session.uid,
          }
        : null,
    });
  });
}
