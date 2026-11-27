"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, json, SITE_URL } from "@/lib/api";
import type { User } from "@/lib/types";
import { cx, Spinner } from "./ui";

interface AdminContext {
  user: User;
  unseen: number;
  refreshCounts: () => void;
}

const Ctx = createContext<AdminContext | null>(null);
export const useAdmin = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin outside AdminShell");
  return c;
};

const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/programmes", label: "Programmes", icon: "◆" },
  { href: "/enrolments", label: "Enrolments", icon: "✉", badge: true },
  { href: "/whatsapp", label: "WhatsApp", icon: "✆" },
  { href: "/analytics", label: "Analytics & Event Tracking", icon: "◔" },
  { href: "/categories", label: "Categories & domains", icon: "☰" },
  { href: "/settings", label: "Enrol form & emails", icon: "⚙" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshCounts = useCallback(() => {
    api<{ data: { unseen: number } }>("/api/cms/admin/enrolments/summary")
      .then((r) => setUnseen(r.data.unseen))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ user: User | null }>("/auth/user")
      .then(async (r) => {
        if (cancelled) return;
        if (!r.user) {
          // The access token may simply have expired; try the refresh cookie once.
          const again = await api("/auth/refresh", json("POST"))
            .then(() => api<{ user: User | null }>("/auth/user"))
            .catch(() => ({ user: null }));
          if (!again.user) return router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          r = again;
        }
        if (r.user!.role?.toLowerCase() !== "admin") return router.replace("/login?denied=1");
        setUser(r.user);
      })
      .catch(() => router.replace("/login"));
    return () => {
      cancelled = true;
    };
    // Checked once per load; pages re-validate through API 401s.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshCounts();
    const t = setInterval(refreshCounts, 60_000);
    return () => clearInterval(t);
  }, [user, refreshCounts]);

  if (!user) return <Spinner label="Checking your session…" />;

  const logout = async () => {
    await api("/auth/logout", json("POST")).catch(() => {});
    router.replace("/login");
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <Ctx.Provider value={{ user, unseen, refreshCounts }}>
      <div className="flex min-h-screen">
        <aside
          className={cx(
            "fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex",
            menuOpen ? "flex" : "hidden",
          )}
        >
          <div className="flex items-center gap-3 px-5 py-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-lg" />
            <div className="leading-tight">
              <p className="font-bold">Edutou</p>
              <p className="text-xs text-neutral-500">Website admin</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive(n.href) ? "bg-orange-50 text-[#c74a00]" : "text-neutral-600 hover:bg-neutral-100",
                )}
              >
                <span aria-hidden className="w-4 text-center">{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {n.badge && unseen > 0 && (
                  <span className="rounded-full bg-[#ff5e00] px-2 py-0.5 text-xs font-semibold text-white" aria-label={`${unseen} new`}>
                    {unseen}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="border-t border-neutral-200 p-4 text-sm">
            <a href={SITE_URL} target="_blank" rel="noreferrer" className="mb-3 block text-neutral-600 hover:text-[#ff5e00]">
              View website ↗
            </a>
            <p className="truncate text-neutral-500" title={user.email}>{user.email}</p>
            <button type="button" onClick={logout} className="mt-1 font-medium text-neutral-700 hover:text-red-600">
              Log out
            </button>
          </div>
        </aside>
        {menuOpen && <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMenuOpen(false)} />}

        <div className="min-w-0 flex-1 md:pl-64">
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
            <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="rounded-lg border border-neutral-300 px-2.5 py-1">☰</button>
            <span className="font-semibold">Edutou admin</span>
            {unseen > 0 && <span className="ml-auto rounded-full bg-[#ff5e00] px-2 py-0.5 text-xs font-semibold text-white">{unseen} new</span>}
          </div>
          <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
