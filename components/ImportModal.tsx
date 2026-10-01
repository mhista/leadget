"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importRows } from "@/lib/actions";
import type { ProspectInput } from "@/lib/types";
import { PLAYBOOKS } from "@/lib/industries";
import { Field, Notice, btn, selectCls } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconUpload } from "@/components/icons";

/**
 * CSV import from anywhere — a LinkedIn Sales Navigator export, Apollo, a
 * Google Sheet, a list someone emailed you. Columns are matched by name, so the
 * file doesn't need to be in any particular shape.
 */

const MAP: [keyof ProspectInput, RegExp][] = [
  ["name", /^(name|business|company|business name|company name|organi[sz]ation|account)$/i],
  ["email", /e-?mail/i],
  ["phone", /phone|mobile|whatsapp|tel/i],
  ["website", /website|url|domain|site/i],
  ["contact_name", /^(contact|contact name|full name|person|first name|owner)$/i],
  ["contact_role", /role|title|position|job/i],
  ["city", /city|town|location/i],
  ["country", /country/i],
  ["industry", /industry|sector|category|niche/i],
  ["linkedin", /linkedin/i],
  ["notes", /note|comment|description/i],
  ["deal_value", /value|budget|deal/i],
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function matchIndustry(v: string, fallback: string) {
  const s = v.toLowerCase();
  if (!s) return fallback;
  const hit = PLAYBOOKS.find((p) => s.includes(p.label.toLowerCase().split(" ")[0]) || s.includes(p.id));
  if (hit) return hit.id;
  if (/propert|realt|estate/.test(s)) return "real-estate";
  if (/pharm|drug|chemist/.test(s)) return "pharmacy";
  if (/law|legal|attorney|solicitor/.test(s)) return "law";
  if (/hospital|medical|health/.test(s)) return "clinic";
  return fallback;
}

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<ProspectInput[] | null>(null);
  const [mapped, setMapped] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [industry, setIndustry] = useState("real-estate");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  async function onFile(file: File) {
    setError(null);
    setFileName(file.name);
    const grid = parseCsv(await file.text());
    if (grid.length < 2) return setError("That file has no rows under the header.");
    const header = grid[0].map((h) => h.trim());
    const cols = header.map((h) => MAP.find(([, re]) => re.test(h))?.[0]);
    if (!cols.includes("name")) return setError(`Couldn't find a business name column. Headers found: ${header.join(", ")}`);
    setMapped(header.map((h, i) => (cols[i] ? `${h} → ${String(cols[i]).replace("_", " ")}` : "")).filter(Boolean));
    setRows(grid.slice(1).map((r) => {
      const o: Record<string, any> = {};
      cols.forEach((k, i) => { if (k && r[i]?.trim() && !o[k]) o[k] = r[i].trim(); });
      if (o.deal_value) o.deal_value = Number(String(o.deal_value).replace(/[^\d.]/g, "")) || null;
      return o as ProspectInput;
    }).filter((r) => r.name));
  }

  function save() {
    if (!rows) return;
    start(async () => {
      const res = await importRows(rows.map((r) => ({ ...r, industry: matchIndustry(String(r.industry ?? ""), industry) })));
      if (!res.ok) return setError(res.error);
      toast(`Imported ${res.data.created}${res.data.skipped ? ` · ${res.data.skipped} duplicates skipped` : ""}.`);
      setRows(null); setFileName("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Import a CSV" description="From a spreadsheet, Apollo, LinkedIn Sales Navigator, or anywhere else. Duplicates are skipped." wide>
      <div className="space-y-5">
        <label className="grain flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:border-ink/40">
          <IconUpload className="h-6 w-6 text-muted" />
          <span className="text-[13.5px] font-medium">{fileName || "Choose a .csv file"}</span>
          <span className="text-[12px] text-muted">Needs a column for the business name. Email, phone, website, city, country, contact and industry are picked up if present.</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>

        {error && <Notice tone="danger">{error}</Notice>}

        {rows && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {mapped.map((m) => <span key={m} className="rounded-pill bg-page-alt px-2.5 py-1 text-[11.5px] text-muted">{m}</span>)}
            </div>
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-sunken text-muted"><tr><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Email</th><th className="px-3 py-2 font-medium">Website</th><th className="px-3 py-2 font-medium">City</th></tr></thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-line"><td className="px-3 py-2 font-medium">{r.name}</td><td className="px-3 py-2 text-muted">{r.email || "—"}</td><td className="px-3 py-2 text-muted">{r.website || "—"}</td><td className="px-3 py-2 text-muted">{r.city || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Field label="Industry for rows that don't say" className="max-w-xs">
              <select className={selectCls} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                {PLAYBOOKS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
              </select>
            </Field>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button onClick={onClose} className={btn("ghost")}>Cancel</button>
          <button onClick={save} disabled={!rows?.length || saving} className={btn("primary")}>{saving && <Spinner />}Import {rows?.length ?? ""} {rows?.length === 1 ? "row" : "rows"}</button>
        </div>
      </div>
    </Modal>
  );
}
