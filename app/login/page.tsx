"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Login failed");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-50 to-white px-4">
      <div className="card p-8 w-full max-w-md">
        <Link href="/" className="text-brand-600 font-semibold">&larr; Saathi</Link>
        <h1 className="text-2xl font-semibold mt-3">Welcome back</h1>
        <p className="text-gray-500 text-sm mt-1">Login to continue your search.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          New here? <Link href="/register" className="text-brand-600 font-medium">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
