"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { runAudit } from "@/lib/actions";
import type { Prospect } from "@/lib/types";
import { btn, ago } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconCheck, IconCopy, IconGauge, IconGlobe, IconShield, IconSmartphone, IconX, IconZap, IconMail, IconPhone } from "@/components/icons";

export function AuditPanel({ p }: { p: Prospect }) {
  const router = useRouter();
  const toast = useToast();
  const [running, start] = useTransition();
  const a = p.audit;

  function run() {
    start(async () => {
      const r = await runAudit(p.id);
      if (!r.ok) return toast(r.error, "error");
      toast(`Audit done — ${r.data.audit?.issues.length ?? 0} issue${r.data.audit?.issues.length === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  if (!p.website) {
    return (
      <section className="card overflow-hidden animate-rise [animation-delay:120ms]">
        <div className="flex items-start gap-4 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning"><IconZap /></span>
          <div>
            <h2 className="text-[13.5px] font-semibold">No website — this is the opportunity</h2>
            <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
              {p.reviews ? `${p.reviews} people have reviewed ${p.name} on Google, so customers are already looking for them — and finding nothing to click. ` : ""}
              Lead with that. Offer a one-page mock-up with their name on it; it&apos;s the easiest yes you&apos;ll get.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const checks = a ? [
    { ok: a.reachable, label: "Loads", icon: <IconGlobe />, detail: a.reachable ? `HTTP ${a.status}` : "Didn't load" },
    { ok: a.https, label: "Secure (HTTPS)", icon: <IconShield />, detail: a.https ? "Padlock shown" : "“Not secure”" },
    { ok: a.mobile_ready, label: "Mobile-ready", icon: <IconSmartphone />, detail: a.mobile_ready ? "Fits phones" : "Desktop only" },
    { ok: (a.load_ms ?? 0) <= 4500, label: "Speed", icon: <IconGauge />, detail: a.load_ms ? `${(a.load_ms / 1000).toFixed(1)}s` : "—" },
    { ok: a.has_contact_form || a.has_whatsapp || a.has_booking, label: "Way to enquire", icon: <IconMail />, detail: [a.has_contact_form && "Form", a.has_whatsapp && "WhatsApp", a.has_booking && "Booking"].filter(Boolean).join(", ") || "None on page" },
    { ok: a.has_analytics, label: "Analytics", icon: <IconGauge />, detail: a.has_analytics ? "Installed" : "None" },
  ] : [];

  return (
    <section className="card overflow-hidden animate-rise [animation-delay:120ms]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-page-alt"><IconGlobe /></span>
          <div>
            <h2 className="text-[13.5px] font-semibold">Website audit</h2>
            <p className="text-[12px] text-muted">{a ? `Checked ${ago(a.checked_at)}${a.platform ? ` · built on ${a.platform}` : ""}` : "What a customer sees when they visit"}</p>
          </div>
        </div>
        <button onClick={run} disabled={running} className={btn(a ? "secondary" : "primary", "sm")}>
          {running ? <><Spinner className="h-3.5 w-3.5" /> Checking…</> : a ? "Re-check" : "Audit website"}
        </button>
      </div>

      {!a ? (
        <div className="px-5 py-8 text-center text-[13px] text-muted">
          {running ? "Visiting the site…" : "One visit to their homepage: speed, security, mobile, how to contact them, and anything that looks neglected. Takes a few seconds."}
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {checks.map((c) => (
              <div key={c.label} className={clsx("flex items-center gap-3 rounded-lg border px-3 py-2.5", c.ok ? "border-line" : "border-danger/25 bg-danger/[.04]")}>
                <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-full", c.ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
                  {c.ok ? <IconCheck className="h-3.5 w-3.5" /> : <IconX className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium">{c.label}</span>
                  <span className="block truncate text-[11.5px] text-muted">{c.detail}</span>
                </span>
              </div>
            ))}
          </div>

          {a.issues.length > 0 && (
            <div>
              <p className="mono mb-2">What to tell them</p>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                {a.issues.map((i) => (
                  <li key={i.id} className="group flex items-start gap-3 px-4 py-3">
                    <span className={clsx("mt-1 h-2 w-2 shrink-0 rounded-full", i.severity === "high" ? "bg-danger" : i.severity === "medium" ? "bg-warning" : "bg-faint")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{i.title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{i.pitch}</p>
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(i.pitch).then(() => toast("Copied."))} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Copy"><IconCopy className="h-4 w-4 text-faint hover:text-ink" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(a.title || a.description) && (
            <div className="rounded-lg bg-sunken p-4">
              <p className="mono mb-2">How Google shows them</p>
              <p className="truncate text-[14px] text-info">{a.title || p.name}</p>
              <p className="truncate text-[12px] text-success">{(a.final_url || a.url).replace(/^https?:\/\//, "")}</p>
              <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">{a.description || <em>No description — Google picks some text from the page.</em>}</p>
            </div>
          )}

          {(a.emails.length > 0 || a.phones.length > 0 || a.socials.length > 0) && (
            <div>
              <p className="mono mb-2">Found on their site</p>
              <div className="flex flex-wrap gap-1.5">
                {a.emails.map((e) => <span key={e} className="inline-flex items-center gap-1 rounded-pill bg-page-alt px-2.5 py-1 text-[12px]"><IconMail className="h-3 w-3" />{e}</span>)}
                {a.phones.map((ph) => <span key={ph} className="inline-flex items-center gap-1 rounded-pill bg-page-alt px-2.5 py-1 text-[12px]"><IconPhone className="h-3 w-3" />{ph}</span>)}
                {a.socials.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="rounded-pill bg-page-alt px-2.5 py-1 text-[12px] hover:bg-line">{s.network}</a>)}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
