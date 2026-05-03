"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Tab = "received" | "sent" | "accepted";
type InterestItem = {
  _id: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  message?: string;
  createdAt: string;
  from: { _id: string; fullName: string; photos: string[]; city?: string; country?: string; profession?: string };
  to: { _id: string; fullName: string; photos: string[]; city?: string; country?: string; profession?: string };
};

export default function InterestsPage() {
  const sp = useSearchParams();
  const initialTab = (sp.get("tab") as Tab) || "received";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [items, setItems] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(t: Tab) {
    setLoading(true);
    const res = await fetch(`/api/interests?direction=${t}`);
    const json = await res.json();
    setItems(json?.data?.items || []);
    setLoading(false);
  }
  useEffect(() => { load(tab); }, [tab]);

  async function act(id: string, action: "accept" | "decline" | "withdraw") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/interests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.ok) await load(tab);
      else alert(json.error || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["received", "sent", "accepted"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              tab === t ? "bg-brand-600 text-white" : "bg-white border border-gray-300 text-gray-700"
            }`}
          >
            {t === "received" ? "Received" : t === "sent" ? "Sent" : "Connected"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          {tab === "received" && "No interests received yet."}
          {tab === "sent" && "You haven't sent any interests yet."}
          {tab === "accepted" && "No connections yet. Accept an interest or get one accepted to start chatting."}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => {
            const peer = tab === "sent" ? it.to : it.from;
            const isPendingForMe = tab === "received" && it.status === "pending";
            const isMineToWithdraw = tab === "sent" && it.status === "pending";
            return (
              <div key={it._id} className="card p-4">
                <Link href={`/profile/${peer._id}`} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden grid place-items-center text-gray-400 font-semibold">
                    {peer.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={peer.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      peer.fullName?.[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{peer.fullName}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {[peer.profession, peer.city].filter(Boolean).join(" \u00b7 ")}
                    </div>
                  </div>
                </Link>
                {it.message && (
                  <div className="text-sm text-gray-700 mt-3 bg-gray-50 rounded-lg p-2">&ldquo;{it.message}&rdquo;</div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <StatusChip status={it.status} />
                  <div className="flex gap-2">
                    {isPendingForMe && (
                      <>
                        <button className="btn-primary text-sm py-1 px-3" disabled={busyId === it._id} onClick={() => act(it._id, "accept")}>
                          Accept
                        </button>
                        <button className="btn-danger text-sm py-1 px-3" disabled={busyId === it._id} onClick={() => act(it._id, "decline")}>
                          Decline
                        </button>
                      </>
                    )}
                    {isMineToWithdraw && (
                      <button className="btn-secondary text-sm py-1 px-3" disabled={busyId === it._id} onClick={() => act(it._id, "withdraw")}>
                        Withdraw
                      </button>
                    )}
                    {it.status === "accepted" && (
                      <Link href={`/messages/${peer._id}`} className="btn-primary text-sm py-1 px-3">
                        Chat
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-emerald-100 text-emerald-700",
    declined: "bg-gray-200 text-gray-700",
    withdrawn: "bg-gray-200 text-gray-700",
  };
  return <span className={`chip ${map[status] || ""}`}>{status}</span>;
}
