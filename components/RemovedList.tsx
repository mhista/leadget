"use client";

import { useEffect, useState, useTransition } from "react";
import { allowAgain, listRemoved } from "@/lib/actions";
import { btn } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";

type Row = { prospect_id: string; name: string; removed_at: string; returns_at: string };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Businesses you deleted, kept out of searches until their cooldown ends. */
export function RemovedList({ days }: { days: number }) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, start] = useTransition();

  const load = () => listRemoved().then((r) => setRows(r.ok ? r.data : []));
  useEffect(() => { load(); }, [days]);

  function allow(ids?: string[]) {
    start(async () => {
      const r = await allowAgain(ids);
      if (!r.ok) return toast(r.error, "error");
      toast(ids ? "It can show up in searches again." : "All removed businesses can show up again.");
      load();
    });
  }

  if (rows === null) return <div className="skeleton h-10" />;
  if (!rows.length) return <p className="text-[12.5px] text-muted">Nothing removed right now. When you delete a prospect it's listed here until it's allowed back.</p>;

  const shown = rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${rows.length} removed…`} className="h-8 flex-1 rounded-md border border-line bg-surface px-3 text-[12.5px] outline-none focus:border-ink/50" />
        <button onClick={() => confirm("Let every removed business show up in searches again?") && allow()} disabled={busy} className={btn("ghost", "sm")}>Allow all back</button>
      </div>
      <ul className="max-h-[280px] divide-y divide-line overflow-y-auto rounded-lg border border-line scroll-thin">
        {shown.map((r) => (
          <li key={r.prospect_id} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
            <span className="min-w-0">
              <span className="block truncate font-medium">{r.name}</span>
              <span className="block text-[11.5px] text-faint">Removed {fmt(r.removed_at)} · back on {fmt(r.returns_at)}</span>
            </span>
            <button onClick={() => allow([r.prospect_id])} disabled={busy} className={btn("secondary", "sm")}>{busy ? <Spinner className="h-3.5 w-3.5" /> : "Allow now"}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
