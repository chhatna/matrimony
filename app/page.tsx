import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function Landing() {
  const session = getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center font-bold">S</div>
          <span className="text-xl font-semibold text-gray-900">Saathi</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary">Login</Link>
          <Link href="/register" className="btn-primary">Sign Up Free</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-gray-900">
            Find your <span className="text-brand-600">life partner</span> with confidence.
          </h1>
          <p className="mt-5 text-lg text-gray-600">
            Verified profiles, intelligent match-making, and private chat. Built for serious relationships.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary text-base px-6 py-3">Create your profile</Link>
            <Link href="/login" className="btn-secondary text-base px-6 py-3">I already have an account</Link>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-4 text-sm text-gray-700">
            <li className="flex items-center gap-2"><Dot /> Verified profiles</li>
            <li className="flex items-center gap-2"><Dot /> Smart match scoring</li>
            <li className="flex items-center gap-2"><Dot /> Real-time chat</li>
            <li className="flex items-center gap-2"><Dot /> Privacy-first design</li>
          </ul>
        </div>
        <div className="card p-6">
          <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-brand-200 to-brand-400 grid place-items-center text-white text-3xl font-semibold">
            Saathi
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {["Verified", "Privacy", "Chat"].map((x) => (
              <div key={x} className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
                <div className="text-sm font-semibold text-gray-800">{x}</div>
                <div className="text-xs text-gray-500">included</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm text-gray-500">
        Made for matrimonial connections. Be safe - never share financial info with matches.
      </footer>
    </main>
  );
}

function Dot() {
  return <span className="w-2 h-2 rounded-full bg-brand-600 inline-block" />;
}
