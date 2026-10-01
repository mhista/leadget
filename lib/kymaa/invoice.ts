import type { Invoice, InvoiceDoc, Prospect, Settings } from "@/lib/types";

/**
 * Invoice maths and defaults, exactly as the kymaa-invoice.html renderer does
 * them: line = qty × rate → subtotal → discount → tax on the discounted amount
 * → total → minus payments = balance due. Pure; runs anywhere.
 */

export const LOCALES: Record<string, string> = { NGN: "en-NG", USD: "en-US", GBP: "en-GB", EUR: "en-IE", GHS: "en-GH", KES: "en-KE", ZAR: "en-ZA", CAD: "en-CA", AUD: "en-AU", AED: "en-AE" };
export const CURRENCIES = Object.keys(LOCALES);

export const STATUS_LABEL: Record<string, string> = { due: "Payment due", overdue: "Overdue", paid: "Paid", draft: "Draft" };

export function money(d: Pick<InvoiceDoc, "currency" | "locale">, n: number) {
  try {
    return new Intl.NumberFormat(d.locale || LOCALES[d.currency] || "en-GB", { style: "currency", currency: d.currency || "NGN", maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n || 0);
  } catch {
    return `${d.currency} ${(n || 0).toFixed(2)}`;
  }
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function day(s: string) {
  if (!s) return "—";
  const x = new Date(`${s}T12:00:00`);
  return isNaN(+x) ? s : `${x.getDate()} ${MON[x.getMonth()]} ${x.getFullYear()}`;
}

export function totals(d: InvoiceDoc, today = new Date().toISOString().slice(0, 10)) {
  const subtotal = d.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const dd = d.discount;
  const discount = dd && dd.value ? (dd.type === "percent" ? (subtotal * dd.value) / 100 : dd.value) : 0;
  const taxable = subtotal - discount;
  const tax = d.tax && d.tax.rate ? (taxable * d.tax.rate) / 100 : 0;
  const total = taxable + tax;
  const paid = d.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
  let status: Exclude<InvoiceDoc["status"], "auto"> = d.status === "auto" ? "due" : d.status;
  if (d.status === "auto") status = balance <= 0 && total > 0 ? "paid" : d.dueAt && d.dueAt < today ? "overdue" : "due";
  return { subtotal, discount, taxable, tax, total, paid, balance, status };
}

const addDays = (from: string, n: number) => {
  const x = new Date(`${from}T12:00:00`);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};

/** KYM-2026-014: prefix, year, then one more than the highest this year. */
export function nextNumber(prefix: string, existing: Pick<Invoice, "doc">[], year = new Date().getFullYear()) {
  const head = `${prefix || "INV"}-${year}-`;
  const max = existing.reduce((m, i) => {
    const n = i.doc.number.startsWith(head) ? parseInt(i.doc.number.slice(head.length), 10) : 0;
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return head + String(max + 1).padStart(3, "0");
}

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function defaultInvoice(s: Settings, number: string, p?: Prospect | null): InvoiceDoc {
  const today = new Date().toISOString().slice(0, 10);
  const currency = CURRENCIES.includes(s.currency) ? s.currency : "NGN";
  const offer = p ? p.mockup ? "Website design & build" : p.audit ? "Website redesign" : "Website" : "";
  return {
    number,
    issuedAt: today,
    dueAt: addDays(today, s.invoice_due_days || 14),
    reference: offer,
    status: "auto",
    currency,
    locale: LOCALES[currency] ?? "en-GB",
    from: { name: s.business_name || s.your_name, legalName: s.legal_name, email: s.sender_email, phone: s.phone, address: lines(s.address) },
    client: {
      name: p?.name ?? "",
      contact: p?.contact_name ? `Attn: ${p.contact_name}` : "",
      email: p?.email ?? "",
      address: p ? [p.address && !p.address.includes(p.city) ? p.address : "", [p.city, p.country].filter(Boolean).join(", ")].filter(Boolean) : [],
    },
    items: [{ title: offer || "Website design", detail: "", qty: 1, rate: p?.deal_value ?? 0 }],
    discount: null,
    tax: s.tax_rate ? { label: s.tax_label || "Tax", rate: s.tax_rate } : null,
    payments: [],
    payment: { bank: s.bank_name, accountName: s.account_name || s.legal_name, accountNumber: s.account_number, swift: s.swift, link: s.pay_link },
    terms: s.invoice_terms,
    notes: s.invoice_notes,
    thanks: s.invoice_thanks || "Thank you for your business.",
    website: s.website,
  };
}
