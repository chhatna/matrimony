import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { Interest } from "@/models/Interest";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { handle, ok, fail, requireSession } from "@/lib/api";

const SendSchema = z.object({
  to: z.string().min(1),
  message: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const url = new URL(req.url);
    const direction = url.searchParams.get("direction") || "received"; // received | sent | accepted
    const status = url.searchParams.get("status");

    await connectDB();
    const filter: Record<string, unknown> = {};
    if (direction === "sent") filter.from = session.uid;
    else if (direction === "accepted") {
      filter.$or = [{ from: session.uid }, { to: session.uid }];
      filter.status = "accepted";
    } else {
      filter.to = session.uid;
    }
    if (status && direction !== "accepted") filter.status = status;

    const items = await Interest.find(filter)
      .sort({ createdAt: -1 })
      .populate("from", "fullName photos city country profession")
      .populate("to", "fullName photos city country profession");

    return ok({ items });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = SendSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 400);
    if (parsed.data.to === session.uid) return fail("Cannot send to yourself", 400);

    await connectDB();
    const target = await User.findById(parsed.data.to);
    if (!target) return fail("User not found", 404);

    const existing = await Interest.findOne({ from: session.uid, to: parsed.data.to });
    if (existing) {
      if (existing.status === "withdrawn") {
        existing.status = "pending";
        existing.message = parsed.data.message;
        existing.respondedAt = null;
        await existing.save();
        await Notification.create({
          user: parsed.data.to,
          type: "interest_received",
          fromUser: session.uid,
        });
        return ok({ interest: existing });
      }
      return fail(`Already ${existing.status}`, 409);
    }

    const interest = await Interest.create({
      from: session.uid,
      to: parsed.data.to,
      message: parsed.data.message,
    });

    await Notification.create({
      user: parsed.data.to,
      type: "interest_received",
      fromUser: session.uid,
    });

    return ok({ interest }, { status: 201 });
  });
}
