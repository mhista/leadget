"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  IconClock, IconFile, IconHome, IconReceipt, IconZap, IconTarget, IconKanban, IconMenu, IconMoon, IconSearch, IconSettings, IconSun, IconUsers, IconX, IconLock, Logo,
} from "@/components/icons";
import { logout } from "@/lib/actions";
import { OwnerMark } from "@/components/ViewBeacon";
import { signOut } from "@/lib/saas/actions";

export type ShellAccount = {
  name: string; email: string; plan: string;
  usage: { searches: number; audits: number; ai: number };
  limits: { searches: number; audits: number; ai: number };
};

/**
 * The frame around every screen: a dark rail on the left (it stays dark in
 * both themes — it's the one constant), the page on the right. On phones the
 * rail becomes a drawer.
 */

const NAV = [
  { href: "/", label: "Overview", icon: IconHome, exact: true },
  { href: "/today", label: "Today", icon: IconTarget, count: "today" as const, alert: true },
  { href: "/find", label: "Find leads", icon: IconSearch },
  { href: "/prospects", label: "Prospects", icon: IconUsers, count: "prospects" as const },
  { href: "/pipeline", label: "Pipeline", icon: IconKanban },
  { href: "/follow-ups", label: "Follow-ups", icon: IconClock, count: "due" as const },
  { href: "/invoices", label: "Invoices", icon: IconReceipt },
  { href: "/templates", label: "Templates", icon: IconFile },
];

export function Shell({
  children, counts, storage, locked, account,
}: {
  children: React.ReactNode;
  counts: { prospects: number; due: number; today: number };
  storage: "file" | "supabase";
  locked: boolean;
  account: ShellAccount | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "light" | "dark") || "light");
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("leadget-theme", next); } catch { /* private mode */ }
  }

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  const rail = (
    <div className="flex h-full flex-col bg-rail text-rail-ink">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Logo />
        <span className="display text-[1.3rem] tracking-tight">Leadget</span>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 px-3" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon, exact, count, alert }) => {
          const active = isActive(href, exact);
          const n = count ? counts[count] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group relative flex h-10 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors duration-200",
                active ? "bg-white/[.07] text-rail-ink" : "text-rail-muted hover:bg-white/[.04] hover:text-rail-ink",
              )}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-accent" />}
              <Icon className="h-[17px] w-[17px]" />
              <span className="flex-1">{label}</span>
              {n > 0 && (
                <span className={clsx(
                  "num min-w-[22px] rounded-pill px-1.5 py-[1px] text-center text-[11px] font-semibold",
                  alert ? "bg-accent text-accent-ink" : "bg-white/[.08] text-rail-muted",
                )}>
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-rail-line px-3 py-3">
        {account && (
          <Link href="/billing" className="mb-2 block rounded-md border border-rail-line bg-white/[.03] px-3 py-2.5 transition-colors hover:bg-white/[.06]">
            <span className="flex items-center justify-between text-[12px]">
              <span className="text-rail-muted">Credits this month</span>
              <span className="rounded-pill bg-accent/15 px-2 py-[1px] text-[10.5px] font-semibold uppercase tracking-wide text-accent">{account.plan}</span>
            </span>
            {(["searches", "audits", "ai"] as const).map((k) => {
              const left = Math.max(0, account.limits[k] - account.usage[k]);
              const pct = Math.min(100, (account.usage[k] / Math.max(1, account.limits[k])) * 100);
              return (
                <span key={k} className="mt-2 block">
                  <span className="flex justify-between text-[11px] text-rail-muted"><span>{k === "ai" ? "AI pitches" : k === "searches" ? "Searches" : "Audits"}</span><span className="num text-rail-ink">{left.toLocaleString()} left</span></span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[.08]"><span className={clsx("block h-full rounded-full", pct > 85 ? "bg-[#F46E62]" : "bg-accent")} style={{ width: `${pct}%` }} /></span>
                </span>
              );
            })}
          </Link>
        )}
        {account && (
          <Link
            href="/billing"
            className={clsx(
              "flex h-10 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors",
              isActive("/billing") ? "bg-white/[.07] text-rail-ink" : "text-rail-muted hover:bg-white/[.04] hover:text-rail-ink",
            )}
          >
            <IconZap className="h-[17px] w-[17px]" /> Billing
          </Link>
        )}
        <Link
          href="/settings"
          className={clsx(
            "flex h-10 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors",
            isActive("/settings") ? "bg-white/[.07] text-rail-ink" : "text-rail-muted hover:bg-white/[.04] hover:text-rail-ink",
          )}
        >
          <IconSettings className="h-[17px] w-[17px]" /> Settings
        </Link>
        <button onClick={toggleTheme} className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-[13.5px] text-rail-muted transition-colors hover:bg-white/[.04] hover:text-rail-ink">
          {theme === "dark" ? <IconSun className="h-[17px] w-[17px]" /> : <IconMoon className="h-[17px] w-[17px]" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        {account ? (
          <form action={signOut}>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/[.04]">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-ink">
                {(account.name || account.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-rail-ink">{account.name || account.email}</span>
                <span className="block text-[11px] text-rail-muted">Sign out</span>
              </span>
            </button>
          </form>
        ) : (
          <>
            {locked && (
              <form action={logout}>
                <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-[13.5px] text-rail-muted transition-colors hover:bg-white/[.04] hover:text-rail-ink">
                  <IconLock className="h-[17px] w-[17px]" /> Lock
                </button>
              </form>
            )}
            <p className="px-3 pt-2 text-[11px] leading-snug text-rail-muted/80">
              <span className={clsx("mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle", storage === "supabase" ? "bg-accent" : "bg-rail-muted")} />
              {storage === "supabase" ? "Synced to Supabase" : "Saved on this computer"}
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100svh] bg-page">
      <OwnerMark />
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] lg:block">{rail}</aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-page/85 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="display text-[1.15rem]">Leadget</span>
        </Link>
        <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-page-alt" aria-label="Open menu">
          <IconMenu />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] animate-rise shadow-lift">
            {rail}
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-md text-rail-muted hover:text-rail-ink" aria-label="Close menu">
              <IconX />
            </button>
          </div>
        </div>
      )}

      <main className="lg:pl-[232px]">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>
      </main>
    </div>
  );
}
