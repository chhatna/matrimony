import { connectDB } from "@/lib/mongodb";
import { Message, makeConversationKey } from "@/models/Message";
import { Interest } from "@/models/Interest";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { handle, ok, requireSession } from "@/lib/api";

/**
 * GET /api/messages           -> list of conversations (latest message per peer)
 * GET /api/messages?peer=<id> -> full thread with one peer
 */
export async function GET(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const url = new URL(req.url);
    const peerId = url.searchParams.get("peer");

    await connectDB();

    if (peerId) {
      const key = makeConversationKey(session.uid, peerId);
      const messages = await Message.find({ conversationKey: key }).sort({ createdAt: 1 }).limit(500);
      await Message.updateMany(
        { conversationKey: key, to: session.uid, readAt: null },
        { $set: { readAt: new Date() } }
      );
      const peer = await User.findById(peerId).select("fullName photos city profession lastActiveAt");
      return ok({ messages, peer });
    }

    const meId = new mongoose.Types.ObjectId(session.uid);
    const convos = await Message.aggregate([
      { $match: { $or: [{ from: meId }, { to: meId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationKey",
          last: { $first: "$$ROOT" },
          unread: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$to", meId] }, { $eq: ["$readAt", null] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { "last.createdAt": -1 } },
      { $limit: 50 },
    ]);

    const peerIds = convos.map((c: { last: { from: unknown; to: unknown } }) =>
      String(c.last.from) === session.uid ? c.last.to : c.last.from
    );
    const peers = await User.find({ _id: { $in: peerIds } }).select(
      "fullName photos city profession lastActiveAt"
    );
    const peerMap = new Map(peers.map((p) => [String(p._id), p]));

    const items = convos.map((c) => {
      const peerId =
        String(c.last.from) === session.uid ? String(c.last.to) : String(c.last.from);
      return {
        peer: peerMap.get(peerId),
        last: c.last,
        unread: c.unread,
      };
    });

    return ok({ items });
  });
}

/** Send a message via REST (chat path is via socket, but REST is a graceful fallback). */
export async function POST(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const { to, body } = await req.json().catch(() => ({}));
    if (!to || !body || typeof body !== "string") {
      return ok({ ok: false, error: "Invalid input" }, { status: 400 });
    }
    if (to === session.uid) return ok({ ok: false, error: "Cannot message yourself" }, { status: 400 });

    await connectDB();
    const accepted = await Interest.findOne({
      status: "accepted",
      $or: [
        { from: session.uid, to },
        { from: to, to: session.uid },
      ],
    });
    if (!accepted) {
      return ok(
        { ok: false, error: "You can only chat after an interest is accepted" },
        { status: 403 }
      );
    }

    const msg = await Message.create({
      conversationKey: makeConversationKey(session.uid, to),
      from: session.uid,
      to,
      body: String(body).slice(0, 4000),
    });

    return ok({ message: msg }, { status: 201 });
  });
}
