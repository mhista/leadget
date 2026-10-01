"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { createInvoice, duplicateInvoice, removeInvoice } from "@/lib/actions";
import type { Invoice, Settings } from "@/lib/types";
import { STATUS_LABEL, day, money, totals } from "@/lib/kymaa/invoice";
import { shareBase } from "@/components/SharePanel";
import { Empty, Notice, ago, btn } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconCopy, IconEye, IconPlus, IconReceipt, IconTrash } from "@/components/icons";

export const STATUS_TONE: Record<string, string> = {
  due: "text-[#0060DF] border-[#0060DF]/40",
  overdue: "text-[#C2410C] border-[#C2410C]/40",
  paid: "text-[#0F7A4A] border-[#0F7A4A]/40",
  draft: "text-muted border-line-strong",
};

export function StatusTag({ status }: { status: string }) {
  return <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[.1em]", STATUS_TONE[status])}><span className="h-1.5 w-1.5 bg-current" />{STATUS_LABEL[status] ?? status}</span>;
}

export function NewInvoiceButton({ prospectId, size = "md", label = "New invoice" }: { prospectId?: string; size?: "sm" | "md"; label?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  return (
    <button disabled={busy} className={btn("primary", size)} onClick={() => start(async () => {
      const r = await createInvoice(prospectId);
      if (!r.ok) return toast(r.error, "error");
      router.push(`/invoices/${r.data.id}`);
    })}>{busy ? <Spinner className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />} {label}</button>
  );
}

export function InvoiceList({ invoices, names, settings, missingBank }: { invoices: Invoice[]; names: Record<string, string>; settings: Settings; missingBank: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [filter, setFilter] = useState<"all" | "due" | "overdue" | "paid" | "draft">("all");
  const [base, setBase] = useState("");
  useEffect(() => setBase(shareBase(settings)), [settings]);

  const rows = invoices.map((i) => ({ i, t: totals(i.doc) }));
  const shown = rows.filter((r) => filter === "all" || r.t.status === filter);
  const byCur = (pick: (r: (typeof rows)[number]) => number, st?: string[]) => {
    const m = new Map<string, number>();
    rows.filter((r) => !st || st.includes(r.t.status)).forEach((r) => m.set(r.i.doc.currency, (m.get(r.i.doc.currency) ?? 0) + pick(r)));
    return [...m.entries()].map(([c, n]) => money({ currency: c, locale: "" }, n)).join(" · ") || "—";
  };

  if (!invoices.length) {
    return (
      <>
        {missingBank && <div className="mb-5"><Notice tone="warning">Add your bank details in <Link href="/settings#documents" className="underline">Settings → Brand &amp; documents</Link> first, so every invoice says how to pay you.</Notice></div>}
        <Empty icon={<IconReceipt />} title="No invoices yet" body="Start one here, or from a prospect's page once they say yes — their name, contact and deal value come across." action={<NewInvoiceButton />} />
      </>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      {missingBank && <Notice tone="warning">Your bank details aren&apos;t set, so invoices show no way to pay. Add them in <Link href="/settings#documents" className="underline">Settings → Brand &amp; documents</Link>.</Notice>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="mono">Outstanding</p><p className="num mt-1 text-[20px] font-semibold">{byCur((r) => r.t.balance, ["due", "overdue"])}</p></div>
        <div className="card p-4"><p className="mono">Overdue</p><p className={clsx("num mt-1 text-[20px] font-semibold", rows.some((r) => r.t.status === "overdue") && "text-[#C2410C]")}>{byCur((r) => r.t.balance, ["overdue"])}</p></div>
        <div className="card p-4"><p className="mono">Collected</p><p className="num mt-1 text-[20px] font-semibold">{byCur((r) => r.t.paid)}</p></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-pill bg-page-alt p-1 text-[12.5px]">
          {(["all", "due", "overdue", "paid", "draft"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={clsx("rounded-pill px-3 py-1 capitalize transition-colors", filter === k ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}>
              {k === "all" ? `All ${invoices.length}` : `${k} ${rows.filter((r) => r.t.status === k).length}`}
            </button>
          ))}
        </div>
        <NewInvoiceButton />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[.08em] text-muted">
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-3 py-3 font-medium">Client</th>
              <th className="px-3 py-3 font-medium">Issued</th>
              <th className="px-3 py-3 font-medium">Due</th>
              <th className="px-3 py-3 text-right font-medium">Total</th>
              <th className="px-3 py-3 text-right font-medium">Balance</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map(({ i, t }) => (
              <tr key={i.id} className="group border-b border-line last:border-0 hover:bg-page-alt/60">
                <td className="px-5 py-3">
                  <Link href={`/invoices/${i.id}`} className="font-mono text-[12px] font-medium hover:underline">{i.doc.number}</Link>
                  <p className="text-[11.5px] text-muted">{i.doc.reference || "—"}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium">{i.doc.client.name || <span className="text-faint">No client yet</span>}</p>
                  {i.prospect_id && names[i.prospect_id] && <Link href={`/prospects/${i.prospect_id}`} className="text-[11.5px] text-muted hover:text-ink">Prospect →</Link>}
                </td>
                <td className="px-3 py-3 text-muted">{day(i.doc.issuedAt)}</td>
                <td className="px-3 py-3 text-muted">{day(i.doc.dueAt)}</td>
                <td className="num px-3 py-3 text-right">{money(i.doc, t.total)}</td>
                <td className="num px-3 py-3 text-right font-medium">{money(i.doc, t.balance)}</td>
                <td className="px-3 py-3">
                  <StatusTag status={t.status} />
                  {i.views > 0 && <p className="mt-1 flex items-center gap-1 text-[11px] text-muted"><IconEye className="h-3 w-3" /> Opened {ago(i.last_viewed_at)}</p>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100">
                    <button title="Copy link" onClick={() => { navigator.clipboard?.writeText(`${base}/i/${i.share_id}`); toast("Invoice link copied."); }} className="grid h-8 w-8 place-items-center rounded-md hover:bg-surface"><IconCopy className="h-3.5 w-3.5" /></button>
                    <button title="Duplicate" disabled={busy} onClick={() => start(async () => { const r = await duplicateInvoice(i.id); if (!r.ok) return toast(r.error, "error"); router.push(`/invoices/${r.data.id}`); })} className="grid h-8 w-8 place-items-center rounded-md hover:bg-surface"><IconPlus className="h-3.5 w-3.5" /></button>
                    <button title="Delete" disabled={busy} onClick={() => { if (confirm(`Delete invoice ${i.doc.number}? Its link stops working.`)) start(async () => { const r = await removeInvoice(i.id); if (!r.ok) return toast(r.error, "error"); router.refresh(); }); }} className="grid h-8 w-8 place-items-center rounded-md text-faint hover:bg-surface hover:text-danger"><IconTrash className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted">Nothing here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
