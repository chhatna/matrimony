"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type Convo = {
  peer: { _id: string; fullName: string; photos?: string[]; city?: string; profession?: string };
  last: { body: string; createdAt: string; from: string };
  unread: number;
};

export default function MessagesPage() {
  const [items, setItems] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/messages");
      const json = await res.json();
      setItems(json?.data?.items || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Messages</h1>
      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          No conversations yet. Connect with matches to start chatting.{" "}
          <Link href="/search" className="text-brand-600 font-medium">Find matches &rarr;</Link>
        </div>
      ) : (
        <div className="card divide-y">
          {items.map((c) => (
            <Link
              key={c.peer?._id}
              href={`/messages/${c.peer?._id}`}
              className="flex items-center gap-3 p-3 hover:bg-gray-50"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden grid place-items-center text-gray-400 font-semibold">
                {c.peer?.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.peer.photos[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  c.peer?.fullName?.[0]?.toUpperCase() || "?"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <div className="font-semibold truncate">{c.peer?.fullName}</div>
                  <div className="text-xs text-gray-400 ml-2 shrink-0">
                    {formatDistanceToNow(new Date(c.last.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-sm text-gray-600 truncate">{c.last.body}</div>
              </div>
              {c.unread > 0 && (
                <span className="ml-2 inline-flex min-w-[22px] h-[22px] px-2 rounded-full bg-brand-600 text-white text-xs items-center justify-center">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
