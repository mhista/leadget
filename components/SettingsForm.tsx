"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { saveSettings } from "@/lib/actions";
import type { Settings } from "@/lib/types";
import { PLAYBOOKS } from "@/lib/industries";
import { Field, btn, inputCls, selectCls } from "@/components/ui";
import { CountryMulti } from "@/components/PlacePicker";
import { RemovedList } from "@/components/RemovedList";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconCheck, IconX } from "@/components/icons";
import { TEAM_PHOTOS } from "@/components/kymaa/ReportEditor";
import { CURRENCIES } from "@/lib/kymaa/invoice";

type Status = { ai: boolean; model: string; google: boolean; storage: "file" | "supabase"; passcode: boolean; saas: boolean };

export function SettingsForm({ settings, status }: { settings: Settings; status: Status }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(settings);
  const [svc, setSvc] = useState("");
  const [saving, start] = useTransition();
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));
  const dirty = JSON.stringify(s) !== JSON.stringify(settings);

  function save(e?: React.FormEvent) {
    e?.preventDefault();
    start(async () => {
      const r = await saveSettings(s);
      if (!r.ok) return toast(r.error, "error");
      toast("Settings saved.");
      router.refresh();
    });
  }

  function addService() {
    const v = svc.trim();
    if (v && !s.services.includes(v)) set("services", [...s.services, v]);
    setSvc("");
  }

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Section title="About you" sub="Used to sign and frame every message.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name"><input className={inputCls} value={s.your_name} onChange={(e) => set("your_name", e.target.value)} placeholder="Diwe" /></Field>
            <Field label="Business name" hint="Optional — your studio or brand."><input className={inputCls} value={s.business_name} onChange={(e) => set("business_name", e.target.value)} /></Field>
            <Field label="What you are"><input className={inputCls} value={s.role} onChange={(e) => set("role", e.target.value)} placeholder="Flutter & web developer" /></Field>
            <Field label="Email you send from"><input type="email" className={inputCls} value={s.sender_email} onChange={(e) => set("sender_email", e.target.value)} /></Field>
            <Field label="Phone / WhatsApp"><input className={inputCls} value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Portfolio website"><input className={inputCls} value={s.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
            <Field label="Leadget's public address" hint="Where report and mock-up links point once you deploy Leadget, e.g. https://leadget-diwe.vercel.app. Leave empty while running on your computer." className="sm:col-span-2">
              <input className={inputCls} value={s.public_url} onChange={(e) => set("public_url", e.target.value.trim())} placeholder="https://…" />
            </Field>
            <Field label="Booking link" hint="Calendly, Cal.com — used as the call to action." className="sm:col-span-2"><input className={inputCls} value={s.booking_link} onChange={(e) => set("booking_link", e.target.value)} placeholder="https://cal.com/you/15min" /></Field>
          </div>
        </Section>

        <Section title="What you sell" sub="Services, and the proof that you're good at them.">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {s.services.map((x) => (
              <span key={x} className="inline-flex items-center gap-1.5 rounded-pill bg-page-alt py-1 pl-3 pr-1.5 text-[12.5px]">
                {x}
                <button type="button" onClick={() => set("services", s.services.filter((y) => y !== x))} className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-line hover:text-ink" aria-label={`Remove ${x}`}><IconX className="h-3 w-3" /></button>
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <input value={svc} onChange={(e) => setSvc(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }} placeholder="Add a service…" className={clsx(inputCls, "h-8 w-44 py-1 text-[12.5px]")} />
            </span>
          </div>
          <Field label="Proof" hint="One or two real results, in plain words. This is the line that makes people reply. Never invent it.">
            <textarea rows={4} className={clsx(inputCls, "leading-relaxed")} value={s.proof} onChange={(e) => set("proof", e.target.value)}
              placeholder="e.g. I recently rebuilt the website for a Lagos law firm — it now works on phones, loads in under two seconds, and their enquiries come through a proper intake form." />
          </Field>
          <Field label="Email signature" hint="Leave empty to build one from the fields above." className="mt-4">
            <textarea rows={4} className={clsx(inputCls, "font-mono text-[12.5px]")} value={s.signature} onChange={(e) => set("signature", e.target.value)} />
          </Field>
          <Field label="Tone" className="mt-4 max-w-xs">
            <select className={selectCls} value={s.tone} onChange={(e) => set("tone", e.target.value as Settings["tone"])}>
              <option value="warm">Warm — friendly, human</option>
              <option value="direct">Direct — short, to the point</option>
              <option value="formal">Formal — for law, finance, corporate</option>
            </select>
          </Field>
        </Section>

        <Section id="documents" title="Brand & documents" sub="Your Kymaa report and invoices. These fill every new document; you can still edit each one before sending.">
          <div className="mb-5 flex items-center gap-4 rounded-lg bg-[#00244E] p-4 text-[#F2F0EA]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo/kymaa-wordmark-light.svg" alt="Kymaa" className="h-5 w-auto" />
            <p className="text-[12px] text-[#9DB0C8]">Reports and invoices use the Kymaa design — navy, Signal blue, the cut corner.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name" hint="Shown under the logo on invoices."><input className={inputCls} value={s.legal_name} onChange={(e) => set("legal_name", e.target.value)} placeholder="Kymaa Digital Solutions" /></Field>
            <Field label="Address" hint="One line per row."><textarea rows={2} className={inputCls} value={s.address} onChange={(e) => set("address", e.target.value)} placeholder="Lagos, Nigeria" /></Field>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[12px] font-medium">Photo on reports</p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => set("photo_url", "")} className={clsx("grid h-12 w-12 place-items-center rounded-md border text-[11px] text-muted", !s.photo_url ? "border-ink" : "border-line")}>None</button>
                {TEAM_PHOTOS.map((t) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <button type="button" key={t.url} onClick={() => set("photo_url", t.url)} title={t.name} className={clsx("h-12 w-12 overflow-hidden rounded-md border-2", s.photo_url === t.url ? "border-ink" : "border-transparent")}><img src={t.url} alt={t.name} className="h-full w-full object-cover object-[50%_20%]" /></button>
                ))}
                <input className={clsx(inputCls, "min-w-[220px] flex-1")} value={s.photo_url} onChange={(e) => set("photo_url", e.target.value)} placeholder="…or an image URL" />
              </div>
            </div>
            <Field label="Report button" hint="Opens WhatsApp with your number, or email if there's no phone."><input className={inputCls} value={s.report_cta_label} onChange={(e) => set("report_cta_label", e.target.value)} /></Field>
            <Field label="Invoice numbers" hint={`Next looks like ${s.invoice_prefix || "INV"}-${new Date().getFullYear()}-001`}><input className={clsx(inputCls, "font-mono uppercase")} value={s.invoice_prefix} onChange={(e) => set("invoice_prefix", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="KYM" /></Field>
          </div>

          <p className="mb-3 mt-6 text-[12px] font-medium">How clients pay you</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank"><input className={inputCls} value={s.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="e.g. GTBank" /></Field>
            <Field label="Account name"><input className={inputCls} value={s.account_name} onChange={(e) => set("account_name", e.target.value)} placeholder={s.legal_name || "Account name"} /></Field>
            <Field label="Account number"><input className={inputCls} value={s.account_number} onChange={(e) => set("account_number", e.target.value)} inputMode="numeric" /></Field>
            <Field label="Sort code / SWIFT" hint="For international clients. Optional."><input className={inputCls} value={s.swift} onChange={(e) => set("swift", e.target.value)} /></Field>
            <Field label="Pay-online link" hint="Paystack / Flutterwave / Stripe payment page. Optional." className="sm:col-span-2"><input className={inputCls} value={s.pay_link} onChange={(e) => set("pay_link", e.target.value)} placeholder="https://paystack.com/pay/…" /></Field>
          </div>

          <p className="mb-3 mt-6 text-[12px] font-medium">Invoice defaults</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Currency" hint="Same as deal values.">
              <select className={selectCls} value={s.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Due after (days)"><input type="number" min={0} className={inputCls} value={s.invoice_due_days} onChange={(e) => set("invoice_due_days", Number(e.target.value))} /></Field>
            <div className="grid grid-cols-[1fr_76px] gap-2">
              <Field label="Tax"><input className={inputCls} value={s.tax_label} onChange={(e) => set("tax_label", e.target.value)} /></Field>
              <Field label="%"><input type="number" min={0} step="any" className={inputCls} value={s.tax_rate || ""} placeholder="0" onChange={(e) => set("tax_rate", Number(e.target.value))} /></Field>
            </div>
            <Field label="Terms" className="sm:col-span-3"><textarea rows={2} className={inputCls} value={s.invoice_terms} onChange={(e) => set("invoice_terms", e.target.value)} /></Field>
            <Field label="Notes" className="sm:col-span-2"><input className={inputCls} value={s.invoice_notes} onChange={(e) => set("invoice_notes", e.target.value)} placeholder="e.g. Includes 30 days of post-launch support." /></Field>
            <Field label="Sign-off"><input className={inputCls} value={s.invoice_thanks} onChange={(e) => set("invoice_thanks", e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="Removed businesses" sub="Anything you add is never shown in search results again. Anything you delete stays out for a while, then comes back.">
          <Field label="Keep removed businesses out of searches for" className="mb-5 max-w-xs">
            <select className={selectCls} value={s.forget_removed_days} onChange={(e) => set("forget_removed_days", Number(e.target.value))}>
              {[[30, "30 days"], [60, "60 days"], [90, "90 days"], [180, "6 months"], [365, "1 year"], [36500, "Forever"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <RemovedList days={settings.forget_removed_days} />
        </Section>

        <Section title="Who you're targeting" sub="Sets the defaults on Find leads and weights your list.">
          <p className="mb-2 text-[12px] font-medium">Industries</p>
          <div className="flex flex-wrap gap-2">
            {PLAYBOOKS.filter((p) => p.id !== "other").map((p) => {
              const on = s.target_industries.includes(p.id);
              return (
                <button type="button" key={p.id}
                  onClick={() => set("target_industries", on ? s.target_industries.filter((x) => x !== p.id) : [...s.target_industries, p.id])}
                  className={clsx("inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-[12.5px] transition-colors", on ? "border-ink bg-ink text-page" : "border-line hover:border-line-strong")}>
                  {p.emoji} {p.label}
                </button>
              );
            })}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <span className="mb-1.5 block text-[12px] font-medium text-ink">Countries</span>
              <CountryMulti value={s.target_countries} onChange={(v) => set("target_countries", v)} />
              <span className="mt-1 block text-[11.5px] text-faint">The first one is the default on Find leads.</span>
            </div>
            <Field label="Currency for deal values & invoices">
              <select className={selectCls} value={s.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Daily outreach goal" hint="10–20 personal messages a day is a strong pace.">
              <input type="number" min={1} max={200} className={inputCls} value={s.daily_goal} onChange={(e) => set("daily_goal", Number(e.target.value) || 10)} />
            </Field>
          </div>
        </Section>
      </div>

      <aside className="space-y-4">
        <div className="card sticky top-6 space-y-5 p-5">
          {status.saas ? (
            <div>
              <h2 className="text-[13.5px] font-semibold">Your plan</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">Credits, invoices and upgrades live on the <a href="/billing" className="text-ink underline underline-offset-2">Billing</a> page.</p>
            </div>
          ) : (
            <>
          <div>
                <h2 className="text-[13.5px] font-semibold">Connections</h2>
                <p className="text-[12px] text-muted">Set in <code className="rounded bg-page-alt px-1">.env.local</code>, then restart.</p>
              </div>
              <ul id="keys" className="space-y-3.5 text-[12.5px]">
                <Status ok={status.ai} title="AI pitches (Groq)" on={`On · ${status.model}`} off="Off — pitches use the playbook writer. Free key at console.groq.com → GROQ_API_KEY" />
                <Status ok={status.google} title="Google Places search" on="On — best business data" off="Off — using OpenStreetMap. Enable “Places API (New)” in Google Cloud → GOOGLE_PLACES_API_KEY" />
                <Status ok={status.storage === "supabase"} title="Cloud storage (Supabase)" on="On — data survives deploys" off="Saved to .data/leadget.json on this computer. Required before deploying: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY" />
                <Status ok={status.passcode} title="Passcode lock" on="On" off="Off — anyone with the URL can open it. Set APP_PASSCODE before deploying." warn />
              </ul>
            </>
          )}
          <div className="border-t border-line pt-4">
            <button className={btn("primary", "md", "w-full")} disabled={!dirty || saving}>{saving ? <Spinner /> : <IconCheck />} {dirty ? "Save settings" : "Saved"}</button>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Section({ id, title, sub, children }: { id?: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-6 p-5 sm:p-6 animate-rise">
      <h2 className="display text-[1.3rem]">{title}</h2>
      <p className="mb-5 mt-0.5 text-[12.5px] text-muted">{sub}</p>
      {children}
    </section>
  );
}

function Status({ ok, title, on, off, warn }: { ok: boolean; title: string; on: string; off: string; warn?: boolean }) {
  return (
    <li className="flex gap-3">
      <span className={clsx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", ok ? "bg-success/15 text-success" : warn ? "bg-warning/15 text-warning" : "bg-page-alt text-faint")}>
        {ok ? <IconCheck className="h-3 w-3" /> : <IconX className="h-3 w-3" />}
      </span>
      <span><span className="block font-medium">{title}</span><span className="block leading-relaxed text-muted">{ok ? on : off}</span></span>
    </li>
  );
}
