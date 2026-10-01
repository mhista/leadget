"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { saveInvoiceDoc, removeInvoice, duplicateInvoice } from "@/lib/actions";
import type { Invoice, InvoiceDoc, Settings } from "@/lib/types";
import { CURRENCIES, LOCALES, day, money, totals } from "@/lib/kymaa/invoice";
import { KymaaInvoice } from "@/components/kymaa/KymaaInvoice";
import { ScaledPreview } from "@/components/kymaa/ScaledPreview";
import { StatusTag } from "@/components/kymaa/InvoiceList";
import { shareBase } from "@/components/SharePanel";
import { Field, btn, inputCls, selectCls } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconArrowLeft, IconCheck, IconCopy, IconExternal, IconPlus, IconTrash } from "@/components/icons";

type Client = { id: string; name: string; email: string; contact: string; address: string; city: string; country: string; deal: number | null };

const lines = (s: string) => s.split("\n");
const today = () => new Date().toISOString().slice(0, 10);

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-[13.5px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

/**
 * The invoice editor: form on the left, the real Kymaa invoice on the right,
 * updating as you type. Save, then share the link or save the A4 PDF.
 */
export function InvoiceEditor({ inv, settings, clients }: { inv: Invoice; settings: Settings; clients: Client[] }) {
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState<InvoiceDoc>(inv.doc);
  const [prospectId, setProspectId] = useState<string | null>(inv.prospect_id);
  const [saved, setSaved] = useState(JSON.stringify({ d: inv.doc, p: inv.prospect_id }));
  const [busy, start] = useTransition();
  const [base, setBase] = useState("");
  useEffect(() => setBase(shareBase(settings)), [settings]);

  const dirty = JSON.stringify({ d, p: prospectId }) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const t = useMemo(() => totals(d), [d]);
  const set = <K extends keyof InvoiceDoc>(k: K, v: InvoiceDoc[K]) => setD((x) => ({ ...x, [k]: v }));
  const link = `${base}/i/${inv.share_id}`;

  function save(then?: () => void, next = d) {
    start(async () => {
      const r = await saveInvoiceDoc(inv.id, next, prospectId);
      if (!r.ok) return toast(r.error, "error");
      setSaved(JSON.stringify({ d: next, p: prospectId }));
      toast("Invoice saved.");
      router.refresh();
      then?.();
    });
  }

  function pickClient(id: string) {
    setProspectId(id || null);
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setD((x) => ({
      ...x,
      client: {
        name: c.name, email: c.email, contact: c.contact ? `Attn: ${c.contact}` : "",
        address: [c.address && !c.address.includes(c.city) ? c.address : "", [c.city, c.country].filter(Boolean).join(", ")].filter(Boolean),
      },
      items: x.items.length === 1 && !x.items[0].rate && c.deal ? [{ ...x.items[0], rate: c.deal }] : x.items,
    }));
  }

  function markPaid() {
    if (t.balance <= 0) return;
    const next = { ...d, status: "auto" as const, payments: [...d.payments, { label: d.payments.length ? "Balance received" : "Payment received", date: today(), amount: t.balance }] };
    setD(next);
    save(undefined, next);
  }

  const item = (i: number, v: Partial<InvoiceDoc["items"][number]>) => set("items", d.items.map((x, j) => (j === i ? { ...x, ...v } : x)));
  const pay = (i: number, v: Partial<InvoiceDoc["payments"][number]>) => set("payments", d.payments.map((x, j) => (j === i ? { ...x, ...v } : x)));

  return (
    <div className="animate-rise">
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/invoices" className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"><IconArrowLeft className="h-3.5 w-3.5" /> Invoices</Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="display text-[clamp(1.6rem,1.3rem+1.2vw,2.3rem)]">Invoice <span className="font-mono text-[.6em] tracking-normal">{d.number}</span></h1>
            <StatusTag status={t.status} />
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            {d.client.name || "No client yet"} · balance <b className="num text-ink">{money(d, t.balance)}</b>
            {inv.views > 0 && <> · opened {inv.views}×</>}
            {dirty && <span className="ml-2 rounded-pill bg-warning/10 px-2 py-0.5 text-warning">Unsaved changes</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.status !== "paid" && t.total > 0 && <button onClick={markPaid} disabled={busy} className={btn("secondary", "md")}><IconCheck className="h-3.5 w-3.5" /> Mark as paid</button>}
          <button onClick={() => { navigator.clipboard?.writeText(link); toast(d.status === "draft" ? "Copied — but drafts don't open for clients. Set the status to Auto first." : "Invoice link copied."); }} className={btn("secondary", "md")}><IconCopy className="h-3.5 w-3.5" /> Copy link</button>
          <button onClick={() => (dirty ? save(() => window.open(`/i/${inv.share_id}?preview=1`, "_blank")) : window.open(`/i/${inv.share_id}?preview=1`, "_blank"))} className={btn("secondary", "md")}><IconExternal className="h-3.5 w-3.5" /> Preview & PDF</button>
          <button onClick={() => save()} disabled={busy || !dirty} className={btn("primary", "md")}>{busy && <Spinner />}Save</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        {/* Form */}
        <div className="space-y-4">
          <Section title="Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice number"><input className={clsx(inputCls, "font-mono")} value={d.number} onChange={(e) => set("number", e.target.value)} /></Field>
              <Field label="Reference"><input className={inputCls} value={d.reference} placeholder="Project or PO" onChange={(e) => set("reference", e.target.value)} /></Field>
              <Field label="Issued"><input type="date" className={inputCls} value={d.issuedAt} onChange={(e) => set("issuedAt", e.target.value)} /></Field>
              <Field label="Due"><input type="date" className={inputCls} value={d.dueAt} onChange={(e) => set("dueAt", e.target.value)} /></Field>
              <Field label="Currency">
                <select className={selectCls} value={d.currency} onChange={(e) => setD((x) => ({ ...x, currency: e.target.value, locale: LOCALES[e.target.value] ?? x.locale }))}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Status" hint={d.status === "auto" ? `Shows “${t.status === "paid" ? "Paid" : t.status === "overdue" ? "Overdue" : "Payment due"}”` : d.status === "draft" ? "Clients can't open drafts" : undefined}>
                <select className={selectCls} value={d.status} onChange={(e) => set("status", e.target.value as InvoiceDoc["status"])}>
                  <option value="auto">Auto (from payments &amp; due date)</option>
                  <option value="draft">Draft</option>
                  <option value="due">Payment due</option>
                  <option value="overdue">Overdue</option>
                  <option value="paid">Paid</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Billed to">
            {clients.length > 0 && (
              <Field label="Link to a prospect" hint="Fills in their details, and logs opens and payments on their timeline.">
                <select className={selectCls} value={prospectId ?? ""} onChange={(e) => pickClient(e.target.value)}>
                  <option value="">— Not linked —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Client name"><input className={inputCls} value={d.client.name} onChange={(e) => set("client", { ...d.client, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Attention"><input className={inputCls} value={d.client.contact} placeholder="Attn: …" onChange={(e) => set("client", { ...d.client, contact: e.target.value })} /></Field>
              <Field label="Email"><input className={inputCls} value={d.client.email} onChange={(e) => set("client", { ...d.client, email: e.target.value })} /></Field>
            </div>
            <Field label="Address" hint="One line per row."><textarea rows={2} className={inputCls} value={d.client.address.join("\n")} onChange={(e) => set("client", { ...d.client, address: lines(e.target.value) })} /></Field>
          </Section>

          <Section title="Line items" hint="Up to about 5 fit on one A4 page.">
            {d.items.map((it, i) => (
              <div key={i} className="rounded-lg border border-line p-3">
                <div className="flex gap-2">
                  <span className="num w-6 shrink-0 pt-2 font-mono text-[11px] text-[#0060DF]">{String(i + 1).padStart(2, "0")}</span>
                  <input className={clsx(inputCls, "font-medium")} value={it.title} placeholder="Service" onChange={(e) => item(i, { title: e.target.value })} />
                  <button onClick={() => set("items", d.items.filter((_, j) => j !== i))} disabled={d.items.length === 1} className="grid w-9 shrink-0 place-items-center rounded-md text-faint hover:bg-page-alt hover:text-danger disabled:opacity-30" aria-label="Remove line"><IconTrash className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 space-y-2 pl-8">
                  <input className={clsx(inputCls, "text-[12.5px]")} value={it.detail} placeholder="One-line scope (optional)" onChange={(e) => item(i, { detail: e.target.value })} />
                  <div className="grid grid-cols-[70px_1fr_auto] items-center gap-2">
                    <input type="number" min={0} step="any" className={clsx(inputCls, "num")} value={it.qty} onChange={(e) => item(i, { qty: Number(e.target.value) })} aria-label="Quantity" />
                    <input type="number" min={0} step="any" className={clsx(inputCls, "num")} value={it.rate || ""} placeholder="Rate" onChange={(e) => item(i, { rate: Number(e.target.value) })} aria-label="Rate" />
                    <span className="num min-w-[96px] text-right text-[12.5px] font-medium">{money(d, (Number(it.qty) || 0) * (Number(it.rate) || 0))}</span>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => set("items", [...d.items, { title: "", detail: "", qty: 1, rate: 0 }])} className={btn("secondary", "sm")}><IconPlus className="h-3.5 w-3.5" /> Add a line</button>
          </Section>

          <Section title="Discount, tax & payments">
            <div className="grid grid-cols-[1fr_110px_90px] items-end gap-2">
              <Field label="Discount"><input className={inputCls} value={d.discount?.label ?? ""} placeholder="e.g. Early start" onChange={(e) => set("discount", { type: d.discount?.type ?? "percent", value: d.discount?.value ?? 0, label: e.target.value })} /></Field>
              <select className={selectCls} value={d.discount?.type ?? "percent"} onChange={(e) => set("discount", { label: d.discount?.label ?? "Discount", value: d.discount?.value ?? 0, type: e.target.value as "percent" | "amount" })} aria-label="Discount type">
                <option value="percent">Percent</option><option value="amount">Amount</option>
              </select>
              <input type="number" min={0} step="any" className={clsx(inputCls, "num")} value={d.discount?.value || ""} placeholder="0" onChange={(e) => set("discount", { label: d.discount?.label || "Discount", type: d.discount?.type ?? "percent", value: Number(e.target.value) })} aria-label="Discount value" />
            </div>
            <div className="grid grid-cols-[1fr_90px] items-end gap-2">
              <Field label="Tax"><input className={inputCls} value={d.tax?.label ?? ""} placeholder="VAT" onChange={(e) => set("tax", { rate: d.tax?.rate ?? 0, label: e.target.value })} /></Field>
              <input type="number" min={0} step="any" className={clsx(inputCls, "num")} value={d.tax?.rate || ""} placeholder="%" onChange={(e) => set("tax", { label: d.tax?.label || settings.tax_label || "VAT", rate: Number(e.target.value) })} aria-label="Tax rate" />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium">Payments received</p>
              <div className="space-y-2">
                {d.payments.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_130px_110px_auto] gap-2">
                    <input className={inputCls} value={p.label} onChange={(e) => pay(i, { label: e.target.value })} aria-label="Payment label" />
                    <input type="date" className={inputCls} value={p.date} onChange={(e) => pay(i, { date: e.target.value })} aria-label="Payment date" />
                    <input type="number" min={0} step="any" className={clsx(inputCls, "num")} value={p.amount || ""} onChange={(e) => pay(i, { amount: Number(e.target.value) })} aria-label="Amount" />
                    <button onClick={() => set("payments", d.payments.filter((_, j) => j !== i))} className="grid w-9 place-items-center rounded-md text-faint hover:bg-page-alt hover:text-danger" aria-label="Remove payment"><IconTrash className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => set("payments", [...d.payments, { label: d.payments.length ? "Payment received" : "Deposit received", date: today(), amount: Math.round(t.total * (d.payments.length ? 1 : 0.5) * 100) / 100 - (d.payments.length ? t.paid : 0) }])} className={clsx(btn("secondary", "sm"), "mt-2")}><IconPlus className="h-3.5 w-3.5" /> Add a payment</button>
            </div>
            <dl className="num space-y-1 border-t border-line pt-3 text-[12.5px]">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(d, t.subtotal)}</dd></div>
              {t.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{money(d, t.discount)}</dd></div>}
              {t.tax > 0 && <div className="flex justify-between"><dt className="text-muted">{d.tax?.label}</dt><dd>{money(d, t.tax)}</dd></div>}
              <div className="flex justify-between font-medium"><dt>Total</dt><dd>{money(d, t.total)}</dd></div>
              {t.paid > 0 && <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd>−{money(d, t.paid)}</dd></div>}
              <div className="flex justify-between text-[14px] font-semibold"><dt>Balance due</dt><dd>{money(d, t.balance)}</dd></div>
            </dl>
          </Section>

          <Section title="How to pay" hint="Defaults come from Settings → Brand & documents.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank"><input className={inputCls} value={d.payment.bank} onChange={(e) => set("payment", { ...d.payment, bank: e.target.value })} /></Field>
              <Field label="Account name"><input className={inputCls} value={d.payment.accountName} onChange={(e) => set("payment", { ...d.payment, accountName: e.target.value })} /></Field>
              <Field label="Account number"><input className={clsx(inputCls, "num")} value={d.payment.accountNumber} onChange={(e) => set("payment", { ...d.payment, accountNumber: e.target.value })} /></Field>
              <Field label="Sort / SWIFT"><input className={inputCls} value={d.payment.swift} placeholder="Optional" onChange={(e) => set("payment", { ...d.payment, swift: e.target.value })} /></Field>
            </div>
            <Field label="Pay-online link" hint="Paystack, Flutterwave or Stripe payment link — adds a “Pay online” button."><input className={inputCls} value={d.payment.link} placeholder="https://paystack.com/pay/…" onChange={(e) => set("payment", { ...d.payment, link: e.target.value })} /></Field>
          </Section>

          <Section title="From, terms & notes">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Your name on it"><input className={inputCls} value={d.from.name} onChange={(e) => set("from", { ...d.from, name: e.target.value })} /></Field>
              <Field label="Legal name"><input className={inputCls} value={d.from.legalName} onChange={(e) => set("from", { ...d.from, legalName: e.target.value })} /></Field>
              <Field label="Email"><input className={inputCls} value={d.from.email} onChange={(e) => set("from", { ...d.from, email: e.target.value })} /></Field>
              <Field label="Phone"><input className={inputCls} value={d.from.phone} onChange={(e) => set("from", { ...d.from, phone: e.target.value })} /></Field>
            </div>
            <Field label="Your address"><textarea rows={2} className={inputCls} value={d.from.address.join("\n")} onChange={(e) => set("from", { ...d.from, address: lines(e.target.value) })} /></Field>
            <Field label="Terms"><textarea rows={3} className={inputCls} value={d.terms} onChange={(e) => set("terms", e.target.value)} /></Field>
            <Field label="Notes"><textarea rows={2} className={inputCls} value={d.notes} placeholder="Optional" onChange={(e) => set("notes", e.target.value)} /></Field>
            <Field label="Sign-off line"><input className={inputCls} value={d.thanks} onChange={(e) => set("thanks", e.target.value)} /></Field>
          </Section>

          <div className="flex flex-wrap gap-2 pt-1">
            <button disabled={busy} onClick={() => start(async () => { const r = await duplicateInvoice(inv.id); if (!r.ok) return toast(r.error, "error"); router.push(`/invoices/${r.data.id}`); })} className={btn("ghost", "sm")}><IconPlus className="h-3.5 w-3.5" /> Duplicate</button>
            <button disabled={busy} onClick={() => { if (confirm(`Delete invoice ${d.number}? Its link stops working.`)) start(async () => { const r = await removeInvoice(inv.id); if (!r.ok) return toast(r.error, "error"); router.push("/invoices"); }); }} className={btn("ghost", "sm", "hover:!text-danger")}><IconTrash className="h-3.5 w-3.5" /> Delete</button>
            <span className="ml-auto self-center text-[11.5px] text-faint">Issued {day(d.issuedAt)}</span>
          </div>
        </div>

        {/* Live preview */}
        <div className="min-w-0">
          <div className="sticky top-6 overflow-hidden rounded-xl bg-[#E9E6DD] p-3 sm:p-5">
            <ScaledPreview width={820}>
              <div className="pointer-events-none"><KymaaInvoice d={d} fixed /></div>
            </ScaledPreview>
          </div>
        </div>
      </div>
    </div>
  );
}
