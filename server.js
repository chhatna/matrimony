/* eslint-disable no-console */
// Plain JavaScript custom server for Next.js + Socket.io.
// We avoid `tsx` here because tsx's global TS transform conflicts with
// Next.js 14 internals on Node 22+. Next.js itself still handles TS for
// all pages and API routes inside `app/`.

const path = require("node:path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");
const { Server: SocketIOServer } = require("socket.io");
const cookie = require("cookie");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const AUTH_COOKIE = "mt_token";

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

function makeConversationKey(a, b) {
  return [String(a), String(b)].sort().join(":");
}

let mongoConnPromise = null;
async function connectDB() {
  if (mongoConnPromise) return mongoConnPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not configured");
  mongoConnPromise = mongoose.connect(uri, { bufferCommands: false });
  return mongoConnPromise;
}

// Local mongoose schemas used only by socket handlers.
// Mongoose dedupes by name, so once a Next.js API route loads its TS model,
// `mongoose.models[name]` returns the already-registered version.
const InterestSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "withdrawn"],
      default: "pending",
      index: true,
    },
    message: { type: String, maxlength: 500 },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
InterestSchema.index({ from: 1, to: 1 }, { unique: true });

const MessageSchema = new mongoose.Schema(
  {
    conversationKey: { type: String, required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, maxlength: 4000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const UserLiteSchema = new mongoose.Schema({ fullName: { type: String } }, { strict: false });

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "interest_received",
        "interest_accepted",
        "interest_declined",
        "message_received",
        "profile_view",
      ],
      required: true,
    },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    payload: { type: mongoose.Schema.Types.Mixed },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

function getModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

app.prepare().then(async () => {
  try {
    await connectDB();
    console.log("[server] connected to MongoDB");
  } catch (e) {
    console.warn("[server] could not connect to MongoDB at startup:", e.message);
  }

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(server, {
    path: "/api/socket",
    cors: { origin: true, credentials: true },
  });

  io.use((socket, nextMw) => {
    try {
      // Accept the JWT from any of three places, in priority order:
      //  1. socket.io `auth: { token }` handshake (preferred for mobile)
      //  2. Authorization: Bearer <jwt> header (also for non-browser clients)
      //  3. mt_token cookie (browser default)
      let token = null;
      const auth = socket.handshake.auth || {};
      if (typeof auth.token === "string" && auth.token.length > 0) {
        token = auth.token;
      }
      if (!token) {
        const authHeader = socket.handshake.headers.authorization || "";
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7);
        }
      }
      if (!token) {
        const raw = socket.handshake.headers.cookie || "";
        const cookies = cookie.parse(raw);
        token = cookies[AUTH_COOKIE];
      }

      const session = token ? verifyToken(token) : null;
      if (!session) return nextMw(new Error("unauthorized"));
      socket.data.uid = session.uid;
      nextMw();
    } catch (e) {
      nextMw(e);
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.data.uid;
    if (!uid) {
      socket.disconnect(true);
      return;
    }
    socket.join(`user:${uid}`);

    socket.on("chat:send", async (payload, ack) => {
      try {
        const { to, body } = payload || {};
        if (!to || !body || typeof body !== "string") {
          if (ack) ack({ ok: false, error: "invalid payload" });
          return;
        }
        if (!mongoose.Types.ObjectId.isValid(to)) {
          if (ack) ack({ ok: false, error: "invalid recipient" });
          return;
        }

        await connectDB();
        const Interest = getModel("Interest", InterestSchema);
        const Message = getModel("Message", MessageSchema);
        const Notification = getModel("Notification", NotificationSchema);

        const accepted = await Interest.findOne({
          status: "accepted",
          $or: [{ from: uid, to }, { from: to, to: uid }],
        });
        if (!accepted) {
          if (ack) ack({ ok: false, error: "Interest not accepted" });
          return;
        }

        const msg = await Message.create({
          conversationKey: makeConversationKey(uid, to),
          from: uid,
          to,
          body: body.slice(0, 4000),
        });

        io.to(`user:${to}`).emit("chat:message", msg.toObject());
        io.to(`user:${uid}`).emit("chat:message", msg.toObject());

        await Notification.create({
          user: to,
          type: "message_received",
          fromUser: uid,
          payload: { preview: body.slice(0, 80) },
        });
        io.to(`user:${to}`).emit("notify", { type: "message_received", from: uid });

        if (ack) ack({ ok: true, message: msg.toObject() });
      } catch (e) {
        console.error("[socket chat:send]", e);
        if (ack) ack({ ok: false, error: "internal error" });
      }
    });

    socket.on("chat:typing", (payload) => {
      if (!payload || !payload.to) return;
      io.to(`user:${payload.to}`).emit("chat:typing", { from: uid, typing: !!payload.typing });
    });

    socket.on("chat:read", async (payload) => {
      if (!payload || !payload.peer) return;
      try {
        await connectDB();
        const Message = getModel("Message", MessageSchema);
        const key = makeConversationKey(uid, payload.peer);
        await Message.updateMany(
          { conversationKey: key, to: uid, readAt: null },
          { $set: { readAt: new Date() } }
        );
        io.to(`user:${payload.peer}`).emit("chat:read", { by: uid });
      } catch (e) {
        console.error("[socket chat:read]", e);
      }
    });

    // -------- Voice call signaling --------
    // WebRTC signaling is relayed through socket.io. We validate that an
    // accepted interest exists between caller and callee, same rule as chat.
    async function areConnected(a, b) {
      if (!mongoose.Types.ObjectId.isValid(a) || !mongoose.Types.ObjectId.isValid(b)) return false;
      await connectDB();
      const Interest = getModel("Interest", InterestSchema);
      const doc = await Interest.findOne({
        status: "accepted",
        $or: [{ from: a, to: b }, { from: b, to: a }],
      }).select("_id");
      return !!doc;
    }

    socket.on("call:invite", async (payload, ack) => {
      try {
        const { to, offer } = payload || {};
        if (!to || !offer) return ack && ack({ ok: false, error: "invalid payload" });
        if (!(await areConnected(uid, to))) {
          return ack && ack({ ok: false, error: "Interest not accepted" });
        }
        let fromName = "";
        try {
          const UserLite = getModel("User", UserLiteSchema);
          const u = await UserLite.findById(uid).select("fullName").lean();
          fromName = u?.fullName || "";
        } catch (e) {
          // best-effort name lookup
        }
        io.to(`user:${to}`).emit("call:invite", { from: uid, fromName, offer });
        if (ack) ack({ ok: true });
      } catch (e) {
        console.error("[socket call:invite]", e);
        if (ack) ack({ ok: false, error: "internal error" });
      }
    });

    socket.on("call:accept", (payload) => {
      if (!payload || !payload.to || !payload.answer) return;
      io.to(`user:${payload.to}`).emit("call:accept", { from: uid, answer: payload.answer });
    });

    socket.on("call:decline", (payload) => {
      if (!payload || !payload.to) return;
      io.to(`user:${payload.to}`).emit("call:decline", { from: uid });
    });

    socket.on("call:end", (payload) => {
      if (!payload || !payload.to) return;
      io.to(`user:${payload.to}`).emit("call:end", { from: uid });
    });

    socket.on("call:ice", (payload) => {
      if (!payload || !payload.to || !payload.candidate) return;
      io.to(`user:${payload.to}`).emit("call:ice", { from: uid, candidate: payload.candidate });
    });
  });

  server.listen(port, () => {
    console.log(`> Matrimony app ready on http://localhost:${port}`);
  });
});
