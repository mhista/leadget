"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { setStage } from "@/lib/actions";
import { STAGES, STAGE_META, type Prospect, type Stage } from "@/lib/types";
import { industryLabel } from "@/lib/industries";
import { ScoreRing, dueLabel, money } from "@/components/ui";
import { Favicon } from "@/components/Favicon";
import { useToast } from "@/components/Toast";

export function Kanban({ prospects, currency }: { prospects: Prospect[]; currency: string }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(prospects);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [showLost, setShowLost] = useState(false);
  const [, start] = useTransition();
  useEffect(() => setItems(prospects), [prospects]);

  function drop(stage: Stage) {
    const id = drag;
    setDrag(null); setOver(null);
    if (!id) return;
    const p = items.find((x) => x.id === id);
    if (!p || p.stage === stage) return;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, stage } : x)));
    start(async () => {
      const r = await setStage(id, stage);
      if (!r.ok) { toast(r.error, "error"); setItems(prospects); return; }
      toast(`${p.name} → ${STAGE_META[stage].label}`);
      router.refresh();
    });
  }

  const cols = STAGES.filter((s) => showLost || s !== "lost");

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          <input type="checkbox" checked={showLost} onChange={(e) => setShowLost(e.target.checked)} className="accent-[rgb(var(--ink))]" /> Show lost
        </label>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 scroll-thin sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex min-w-max gap-3">
          {cols.map((s, ci) => {
            const list = items.filter((p) => p.stage === s).sort((a, b) => b.score - a.score);
            const value = list.reduce((n, p) => n + (p.deal_value ?? 0), 0);
            return (
              <div
                key={s}
                onDragOver={(e) => { e.preventDefault(); setOver(s); }}
                onDragLeave={() => setOver((o) => (o === s ? null : o))}
                onDrop={() => drop(s)}
                className={clsx("flex w-[272px] shrink-0 flex-col rounded-xl border bg-page-alt/60 transition-colors duration-200 animate-rise",
                  over === s ? "border-ink/40 bg-accent/10" : "border-line")}
                style={{ animationDelay: `${ci * 40}ms` }}
              >
                <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5 pt-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: STAGE_META[s].hue }} />
                    <h2 className="text-[13px] font-semibold">{STAGE_META[s].label}</h2>
                    <span className="num text-[12px] text-faint">{list.length}</span>
                  </div>
                  {value > 0 && <span className="num text-[11.5px] text-muted">{money(value, currency)}</span>}
                </div>
                <div className="mx-3.5 mb-2 h-[2px] rounded-full" style={{ background: STAGE_META[s].hue, opacity: 0.35 }} />
                <div className="flex max-h-[calc(100svh-260px)] min-h-[120px] flex-col gap-2 overflow-y-auto px-2.5 pb-3 scroll-thin">
                  {list.map((p) => {
                    const due = dueLabel(p.next_follow_up);
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDrag(p.id)}
                        onDragEnd={() => { setDrag(null); setOver(null); }}
                        className={clsx("group cursor-grab rounded-lg border border-line bg-surface p-3 shadow-[0_1px_0_rgb(var(--shadow)/.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft active:cursor-grabbing",
                          drag === p.id && "rotate-[1.5deg] opacity-60")}
                      >
                        <Link href={`/prospects/${p.id}`} className="flex items-start gap-2.5" draggable={false}>
                          <Favicon website={p.website} name={p.name} size={28} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium group-hover:underline group-hover:underline-offset-4">{p.name}</p>
                            <p className="truncate text-[11.5px] text-muted">{industryLabel(p.industry)}{p.city ? ` · ${p.city}` : ""}</p>
                          </div>
                          <ScoreRing score={p.score} size={30} />
                        </Link>
                        <div className="mt-2.5 flex items-center justify-between text-[11.5px]">
                          <span className="num text-muted">{money(p.deal_value, currency)}</span>
                          {due && <span className={clsx(due.tone === "danger" ? "text-danger" : due.tone === "warning" ? "text-warning" : "text-faint")}>{due.text}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && <p className="px-2 py-6 text-center text-[12px] text-faint">Drop here</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
