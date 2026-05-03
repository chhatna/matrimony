"use client";
import { useState, useRef } from "react";

export default function PhotoManager({ photos: initial }: { photos: string[] }) {
  const [photos, setPhotos] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Upload failed");
      setPhotos(json.data.photos);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  async function onDelete(url: string) {
    if (!confirm("Delete this photo?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (json.ok) setPhotos(json.data.photos);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Photos</h2>
        <button className="btn-secondary text-sm" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? "Uploading..." : "Add photo"}
        </button>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
      </div>
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
      {photos.length === 0 ? (
        <div className="text-sm text-gray-500">No photos yet. Upload up to 6 JPG/PNG/WEBP (max 5MB each).</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="photo" className="w-full h-full object-cover" />
              <button
                onClick={() => onDelete(p)}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
