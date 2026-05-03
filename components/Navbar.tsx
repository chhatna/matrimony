"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/interests", label: "Interests" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState<{ notifs: number; msgs: number }>({ notifs: 0, msgs: 0 });

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const [n, m] = await Promise.all([
          fetch("/api/notifications").then((r) => r.json()),
          fetch("/api/messages").then((r) => r.json()),
        ]);
        if (cancelled) return;
        const msgs =
          (m?.data?.items as { unread: number }[] | undefined)?.reduce(
            (s, x) => s + (x.unread || 0),
            0
          ) ?? 0;
        setUnread({ notifs: n?.data?.unread ?? 0, msgs });
      } catch {
        /* ignore */
      }
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white grid place-items-center font-bold">S</div>
          <span className="font-semibold text-gray-900 hidden sm:inline">Saathi</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            const badge =
              n.href === "/messages" ? unread.msgs : n.href === "/dashboard" ? unread.notifs : 0;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "px-3 py-1.5 text-sm rounded-md font-medium relative",
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {n.label}
                {badge > 0 && (
                  <span className="ml-1 inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] items-center justify-center">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-gray-700">Hi, {name.split(" ")[0]}</span>
          <button onClick={logout} className="btn-secondary text-sm py-1.5 px-3">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
