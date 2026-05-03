"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  async function doDelete() {
    if (confirmText !== "DELETE") return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/me", { method: "DELETE" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        alert("Failed to delete account.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!showConfirm) {
    return (
      <button className="btn-danger w-full" onClick={() => setShowConfirm(true)}>
        Delete account
      </button>
    );
  }
  return (
    <div className="space-y-2 border border-red-300 bg-red-50 rounded-lg p-3">
      <p className="text-sm text-red-700">
        This permanently deletes your profile, photos, interests, and messages. Type{" "}
        <span className="font-mono font-bold">DELETE</span> to confirm.
      </p>
      <input
        className="input"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type DELETE"
      />
      <div className="flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => setShowConfirm(false)} disabled={busy}>
          Cancel
        </button>
        <button
          className="btn-danger flex-1"
          onClick={doDelete}
          disabled={busy || confirmText !== "DELETE"}
        >
          {busy ? "Deleting..." : "Delete forever"}
        </button>
      </div>
    </div>
  );
}
