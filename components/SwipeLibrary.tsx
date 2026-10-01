"use client";

import { Fragment, useMemo, useState } from "react";
import clsx from "clsx";
import { SWIPES, SWIPE_CATEGORIES, type Swipe } from "@/lib/swipe";
import { renderTemplate } from "@/lib/render";
import type { Prospect, Settings } from "@/lib/types";
import { btn } from "@/components/ui";
import { IconChat, IconChevronDown, IconCopy, IconLinkedin, IconMail, IconPlus, IconSearch, IconSparkle } from "@/components/icons";

/**
 * The swipe file, as a filterable table. On the Templates page it saves
 * angles into your templates; inside the composer it previews each one
 * already filled in for the prospect you're writing to.
 */
export function SwipeLibrary({
  prospect, settings, onUse, onSave, onAi, highlight = [], compact,
}: {
  prospect?: Prospect;
  settings?: Settings;
  onUse?: (s: Swipe) => void;
  onSave?: (s: Swipe) => void;
  onAi?: (s: Swipe) => void;
  highlight?: string[];
  compact?: boolean;
}) {
  const [cat, setCat] = useState<string>("All");
  const [channel, setChannel] = useState<"all" | Swipe["channel"]>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = SWIPES.filter((x) =>
      (cat === "All" || x.category === cat) && (channel === "all" || x.channel === channel) &&
      (!s || `${x.angle} ${x.category} ${x.subject} ${x.body} ${x.guidance}`.toLowerCase().includes(s)));
    return r.sort((a, b) => Number(highlight.includes(b.id)) - Number(highlight.includes(a.id)));
  }, [cat, channel, q, highlight]);

  const preview = (s: Swipe) => (prospect && settings ? renderTemplate(s, prospect, settings) : { subject: s.subject, body: s.body });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search angles…" className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-[13px] outline-none focus:border-ink/50" />
        </div>
        <div className="flex items-center gap-1 rounded-pill bg-page-alt p-1 text-[12px]">
          {(["all", "email", "whatsapp", "linkedin"] as const).map((c) => (
            <button key={c} onClick={() => setChannel(c)} className={clsx("rounded-pill px-3 py-1 capitalize transition-colors", channel === c ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}>{c === "all" ? "All channels" : c}</button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {["All", ...SWIPE_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={clsx("h-8 rounded-pill border px-3 text-[12.5px] transition-colors", cat === c ? "border-brand bg-brand/10 font-medium text-brand" : "border-line hover:border-line-strong")}>
            {c}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-sunken">
            <tr className="text-[11px] uppercase tracking-wider text-muted">
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">Angle</th>
              {!compact && <th className="hidden px-3 py-2.5 font-medium md:table-cell">Subject</th>}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const isOpen = open === s.id;
              const pv = isOpen ? preview(s) : null;
              const suggested = highlight.includes(s.id);
              return (
                <Fragment key={s.id}>
                  <tr onClick={() => setOpen(isOpen ? null : s.id)} className={clsx("cursor-pointer border-t border-line transition-colors hover:bg-sunken", isOpen && "bg-sunken")}>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-block whitespace-nowrap rounded-sm border border-brand/30 bg-brand/[.06] px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-wide text-brand">{s.category}</span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="flex items-center gap-1.5 font-medium">
                        {s.channel === "email" ? <IconMail className="h-3.5 w-3.5 text-faint" /> : s.channel === "whatsapp" ? <IconChat className="h-3.5 w-3.5 text-faint" /> : <IconLinkedin className="h-3.5 w-3.5 text-faint" />}
                        {s.angle}
                        {suggested && <span className="rounded-pill bg-accent px-1.5 py-[1px] text-[10px] font-semibold text-accent-ink">Suggested</span>}
                        {s.step !== "opener" && <span className="rounded-pill bg-page-alt px-1.5 py-[1px] text-[10px] text-muted">{s.step}</span>}
                      </p>
                      {compact && s.subject && <p className="mt-0.5 truncate text-[12px] text-muted">{s.subject}</p>}
                    </td>
                    {!compact && <td className="hidden max-w-[280px] truncate px-3 py-3 align-top text-muted md:table-cell">{s.subject || "—"}</td>}
                    <td className="pr-4 align-top"><IconChevronDown className={clsx("mt-3.5 h-4 w-4 text-faint transition-transform", isOpen && "rotate-180")} /></td>
                  </tr>
                  {isOpen && pv && (
                    <tr className="bg-sunken">
                      <td colSpan={compact ? 3 : 4} className="px-4 pb-4">
                        <p className="mb-2 text-[12px] text-muted"><span className="font-medium text-ink">When to use:</span> {s.guidance}</p>
                        <div className="rounded-md border border-line bg-surface p-4">
                          {pv.subject && <p className="mb-2 text-[12.5px]"><span className="text-muted">Subject:</span> <span className="font-medium">{pv.subject}</span></p>}
                          <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{highlightFill(pv.body)}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <button onClick={() => navigator.clipboard?.writeText(`${pv.subject ? pv.subject + "\n\n" : ""}${pv.body}`)} className={btn("ghost", "sm")}><IconCopy className="h-3.5 w-3.5" /> Copy</button>
                          {onSave && <button onClick={() => onSave(s)} className={btn("secondary", "sm")}><IconPlus className="h-3.5 w-3.5" /> Save to my templates</button>}
                          {onAi && <button onClick={() => onAi(s)} className={btn("secondary", "sm")}><IconSparkle className="h-3.5 w-3.5" /> AI: write it in this angle</button>}
                          {onUse && <button onClick={() => onUse(s)} className={btn("primary", "sm")}>Use this</button>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {list.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-[13px] text-muted">No angle matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Show [fill-ins] and unfilled {{vars}} so they're impossible to miss. */
export function highlightFill(text: string) {
  const parts = text.split(/(\[[^\]\n]{2,160}\]|\{\{\s*\w+\s*\}\})/g);
  return parts.map((part, i) =>
    /^\[.*\]$/.test(part) ? <mark key={i} className="rounded-sm bg-warning/15 px-0.5 text-warning">{part}</mark>
      : /^\{\{.*\}\}$/.test(part) ? <mark key={i} className="rounded-sm bg-info/10 px-0.5 font-mono text-[11.5px] text-info">{part}</mark>
        : <Fragment key={i}>{part}</Fragment>,
  );
}
