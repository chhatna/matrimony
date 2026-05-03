"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Initial = { id: string; status: "pending" | "accepted" | "declined" | "withdrawn"; iSent: boolean } | null;

export default function InterestActions({ targetId, initial }: { targetId: string; initial: Initial }) {
  const router = useRouter();
  const [state, setState] = useState<Initial>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showMsg, setShowMsg] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: targetId, message: msg || undefined }),
      });
      const json = await res.json();
      if (json.ok) {
        setState({ id: json.data.interest._id, status: "pending", iSent: true });
        setShowMsg(false);
      } else {
        alert(json.error || "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function act(action: "accept" | "decline" | "withdraw") {
    if (!state) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/interests/${state.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.ok) {
        setState({ ...state, status: json.data.interest.status });
        router.refresh();
      } else {
        alert(json.error || "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <div className="space-y-2">
        {showMsg && (
          <textarea
            className="input min-h-[80px]"
            maxLength={500}
            placeholder="Optional message (max 500 chars)"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        )}
        <div className="flex gap-2">
          {showMsg ? (
            <>
              <button className="btn-primary" onClick={send} disabled={busy}>Send interest</button>
              <button className="btn-secondary" onClick={() => setShowMsg(false)} disabled={busy}>Cancel</button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => setShowMsg(true)} disabled={busy}>
              Send interest
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state.status === "accepted") {
    return (
      <div className="flex items-center gap-3">
        <span className="chip bg-emerald-100 text-emerald-700">Connected</span>
        <Link href={`/messages/${targetId}`} className="btn-primary">Open chat</Link>
      </div>
    );
  }
  if (state.status === "declined") {
    return <span className="chip bg-gray-200 text-gray-700">Interest declined</span>;
  }
  if (state.status === "withdrawn") {
    return (
      <button className="btn-primary" onClick={send} disabled={busy}>Send interest again</button>
    );
  }
  // pending
  if (state.iSent) {
    return (
      <div className="flex gap-2 items-center">
        <span className="chip bg-amber-100 text-amber-700">Interest sent — pending</span>
        <button className="btn-secondary text-sm" onClick={() => act("withdraw")} disabled={busy}>
          Withdraw
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button className="btn-primary" onClick={() => act("accept")} disabled={busy}>Accept</button>
      <button className="btn-danger" onClick={() => act("decline")} disabled={busy}>Decline</button>
    </div>
  );
}
