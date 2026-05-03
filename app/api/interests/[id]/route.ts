import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Interest } from "@/models/Interest";
import { Notification } from "@/models/Notification";
import { handle, ok, fail, requireSession } from "@/lib/api";

const ActionSchema = z.object({
  action: z.enum(["accept", "decline", "withdraw"]),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  return handle(async () => {
    const session = requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid action", 400);

    await connectDB();
    const interest = await Interest.findById(ctx.params.id);
    if (!interest) return fail("Interest not found", 404);

    const isReceiver = String(interest.to) === session.uid;
    const isSender = String(interest.from) === session.uid;

    if (parsed.data.action === "accept" || parsed.data.action === "decline") {
      if (!isReceiver) return fail("Only the recipient can accept/decline", 403);
      if (interest.status !== "pending") return fail(`Already ${interest.status}`, 409);
      interest.status = parsed.data.action === "accept" ? "accepted" : "declined";
      interest.respondedAt = new Date();
      await interest.save();
      await Notification.create({
        user: interest.from,
        type: parsed.data.action === "accept" ? "interest_accepted" : "interest_declined",
        fromUser: session.uid,
      });
      return ok({ interest });
    }

    // withdraw
    if (!isSender) return fail("Only the sender can withdraw", 403);
    if (interest.status !== "pending") return fail(`Already ${interest.status}`, 409);
    interest.status = "withdrawn";
    await interest.save();
    return ok({ interest });
  });
}
