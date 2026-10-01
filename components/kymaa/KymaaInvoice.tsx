import "./kymaa.css";
import clsx from "clsx";
import type { InvoiceDoc } from "@/lib/types";
import { STATUS_LABEL, day, money, totals } from "@/lib/kymaa/invoice";
import { KymaaLogo } from "./Logo";

/**
 * The Kymaa invoice. Markup and class names follow kymaa-invoice.html
 * one-to-one; totals, balance and status are computed the same way.
 */
export function KymaaInvoice({ d, fixed, page }: { d: InvoiceDoc; fixed?: boolean; page?: boolean }) {
  const t = totals(d);
  const m = (n: number) => money(d, n);
  const f = d.from, c = d.client;
  const clientLines = [c.contact, c.email, ...c.address].filter(Boolean).join("\n");
  const rows: [string, string, string?][] = [["Subtotal", m(t.subtotal)]];
  if (t.discount && d.discount) rows.push([`${d.discount.label || "Discount"}${d.discount.type === "percent" ? ` (${d.discount.value}%)` : ""}`, `−${m(t.discount)}`]);
  if (t.tax && d.tax) rows.push([`${d.tax.label || "Tax"} (${d.tax.rate}%)`, m(t.tax)]);
  rows.push(["Total", m(t.total), "sep"]);
  d.payments.filter((p) => p.amount).forEach((p) => rows.push([`${p.label || "Payment"}${p.date ? ` · ${day(p.date)}` : ""}`, `−${m(p.amount)}`]));
  const bank = ([["Bank", d.payment.bank], ["Account name", d.payment.accountName], ["Account number", d.payment.accountNumber], ["Sort / SWIFT", d.payment.swift], ["Reference", d.number]] as const).filter((r) => r[1]);
  const site = (d.website || "kymaa.tech").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const paid = t.status === "paid";

  return (
    <div className={clsx("ky ky-i", fixed && "ky-fixed", page && "ky-page")}>
      <article className="sheet" aria-labelledby="inv-h">
        <div className="corner" aria-hidden="true" />
        <header className="top">
          <div>
            <KymaaLogo className="logo" />
            {f.legalName && <p className="mono legal">{f.legalName}</p>}
          </div>
        </header>

        <div className="title-row">
          <div>
            <h1 className="disp" id="inv-h">Invoice</h1>
            <p className="mono marker no"><span>{d.number}</span></p>
          </div>
          <span className={`mono status is-${t.status}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
        </div>

        <dl className="meta">
          <div><dt className="mono muted">Issued</dt><dd>{day(d.issuedAt)}</dd></div>
          <div><dt className="mono muted">Due</dt><dd>{paid ? "Paid" : day(d.dueAt)}</dd></div>
          <div><dt className="mono muted">Reference</dt><dd>{d.reference || "—"}</dd></div>
          <div className="big"><dt className="mono muted">Balance due</dt><dd className="num">{m(t.balance)}</dd></div>
        </dl>

        <div className="parties">
          <div>
            <h2 className="mono muted">Billed to</h2>
            <p className="p-name">{c.name}</p>
            <p className="p-lines">{clientLines}</p>
          </div>
          <div>
            <h2 className="mono muted">From</h2>
            <p className="p-name">{f.name}</p>
            <p className="p-lines">{f.address.join("\n")}</p>
          </div>
        </div>

        <table className="items">
          <thead><tr>
            <th className="mono c-n" scope="col">#</th>
            <th className="mono" scope="col">Description</th>
            <th className="mono r c-q" scope="col">Qty</th>
            <th className="mono r c-rate" scope="col">Rate</th>
            <th className="mono r c-amt" scope="col">Amount</th>
          </tr></thead>
          <tbody>
            {d.items.map((it, i) => (
              <tr key={i}>
                <td className="c-n">{String(i + 1).padStart(2, "0")}</td>
                <td><div className="it-title">{it.title}</div>{it.detail && <div className="it-detail">{it.detail}</div>}</td>
                <td className="r c-q num">{it.qty}</td>
                <td className="r c-rate num">{m(it.rate)}</td>
                <td className="r c-amt num">{m((Number(it.qty) || 0) * (Number(it.rate) || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="sum">
          {!paid ? (
            <div className="pay">
              <h2 className="mono marker">How to pay</h2>
              <dl>{bank.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>
              {d.payment.link && <a className="btn" href={d.payment.link} target="_blank" rel="noopener noreferrer">Pay online <span aria-hidden="true">→</span></a>}
            </div>
          ) : <div />}
          <div>
            <table className="totals num"><tbody>
              {rows.map(([k, v, cls], i) => <tr key={i} className={cls}><td>{k}</td><td>{v}</td></tr>)}
            </tbody></table>
            <div className="due"><span className="mono">Balance due</span><span className="amt num">{m(t.balance)}</span></div>
            {paid && <p className="mono paid-note">Paid in full. Thank you.</p>}
          </div>
        </div>

        {(d.terms || d.notes) && (
          <div className="notes">
            {d.terms && <div><h2 className="mono muted">Terms</h2><p>{d.terms}</p></div>}
            {d.notes && <div><h2 className="mono muted">Notes</h2><p>{d.notes}</p></div>}
          </div>
        )}

        <footer className="foot">
          <p className="serif thanks">{d.thanks}</p>
          <p className="mono contact">
            {f.email && <><a href={`mailto:${f.email}`}>{f.email}</a><br /></>}
            {f.phone && <><span>{f.phone}</span><br /></>}
            <a href={`https://${site}`} target="_blank" rel="noopener noreferrer">{site}</a>
          </p>
        </footer>
      </article>
    </div>
  );
}
