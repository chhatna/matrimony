"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { format } from "date-fns";
import { Phone } from "lucide-react";
import { useCall } from "@/components/CallProvider";

type Msg = { _id: string; from: string; to: string; body: string; createdAt: string; readAt?: string | null };
type Peer = { _id: string; fullName: string; photo: string | null; subtitle: string };

export default function ChatWindow({ peer }: { peer: Peer }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { startCall, state: callState } = useCall();

  // Initial load
  useEffect(() => {
    (async () => {
      const [m, who] = await Promise.all([
        fetch(`/api/messages?peer=${peer._id}`).then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
      ]);
      setMessages(m?.data?.messages || []);
      setMe(who?.data?.user?._id || null);
    })();
  }, [peer._id]);

  // Socket
  useEffect(() => {
    const s: Socket = io("/", { path: "/api/socket", withCredentials: true });
    socketRef.current = s;
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("chat:message", (msg: Msg) => {
      const involvesPeer =
        (msg.from === peer._id && msg.to === me) ||
        (msg.to === peer._id && msg.from === me);
      if (!involvesPeer) return;
      setMessages((prev) => (prev.some((p) => p._id === msg._id) ? prev : [...prev, msg]));
      if (msg.from === peer._id) {
        s.emit("chat:read", { peer: peer._id });
      }
    });
    s.on("chat:typing", (e: { from: string; typing: boolean }) => {
      if (e.from === peer._id) setPeerTyping(e.typing);
    });
    s.on("chat:read", (e: { by: string }) => {
      if (e.by === peer._id) {
        setMessages((prev) => prev.map((m) => (m.from === me && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)));
      }
    });
    return () => {
      s.close();
    };
  }, [peer._id, me]);

  // Mark messages as read on open
  useEffect(() => {
    if (connected) socketRef.current?.emit("chat:read", { peer: peer._id });
  }, [connected, peer._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, peerTyping]);

  function send() {
    const body = input.trim();
    if (!body || !socketRef.current) return;
    socketRef.current.emit(
      "chat:send",
      { to: peer._id, body },
      (ack: { ok: boolean; message?: Msg; error?: string }) => {
        if (!ack?.ok) alert(ack?.error || "Failed to send");
      }
    );
    setInput("");
    socketRef.current.emit("chat:typing", { to: peer._id, typing: false });
  }

  function onInputChange(v: string) {
    setInput(v);
    if (!socketRef.current) return;
    socketRef.current.emit("chat:typing", { to: peer._id, typing: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit("chat:typing", { to: peer._id, typing: false });
    }, 1500);
  }

  return (
    <div className="card flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-3 p-3 border-b">
        <Link href="/messages" className="text-gray-500 hover:text-gray-700 text-sm">&larr;</Link>
        <Link href={`/profile/${peer._id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden grid place-items-center text-gray-500 font-semibold">
            {peer.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={peer.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              peer.fullName[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{peer.fullName}</div>
            <div className="text-xs text-gray-500 truncate">
              {peerTyping ? "typing..." : peer.subtitle || (connected ? "online" : "offline")}
            </div>
          </div>
        </Link>
        <button
          onClick={() => startCall(peer._id, peer.fullName)}
          disabled={callState !== "idle"}
          title="Voice call"
          aria-label="Voice call"
          className="p-2 rounded-full hover:bg-gray-100 text-brand-600 disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 mt-10">
            Say hello to start the conversation.
          </div>
        )}
        {messages.map((m) => {
          const mine = m.from === me;
          return (
            <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  mine ? "bg-brand-600 text-white rounded-br-sm" : "bg-white border border-gray-200 rounded-bl-sm"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-gray-400"}`}>
                  {format(new Date(m.createdAt), "p")}
                  {mine && (m.readAt ? " \u2713\u2713" : " \u2713")}
                </div>
              </div>
            </div>
          );
        })}
        {peerTyping && (
          <div className="text-xs text-gray-500 italic">{peer.fullName} is typing...</div>
        )}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          className="input flex-1"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn-primary" onClick={send} disabled={!input.trim() || !connected}>
          Send
        </button>
      </div>
    </div>
  );
}
