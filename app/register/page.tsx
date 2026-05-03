"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    gender: "male",
    dob: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Registration failed");
      router.push("/profile/edit?welcome=1");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-50 to-white px-4 py-10">
      <div className="card p-8 w-full max-w-lg">
        <Link href="/" className="text-brand-600 font-semibold">&larr; Saathi</Link>
        <h1 className="text-2xl font-semibold mt-3">Create your free profile</h1>
        <p className="text-gray-500 text-sm mt-1">Takes less than a minute. Add details later.</p>

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Full name</label>
            <input className="input" required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Password (min 8 chars)</label>
            <input className="input" type="password" minLength={8} required value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input className="input" type="date" required value={form.dob} onChange={(e) => set("dob", e.target.value)} />
          </div>
          {err && <div className="col-span-2 text-red-600 text-sm">{err}</div>}
          <button className="btn-primary col-span-2" disabled={busy}>
            {busy ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Already have an account? <Link href="/login" className="text-brand-600 font-medium">Login</Link>
        </p>
      </div>
    </main>
  );
}
