"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { runAudit, setStage, snooze } from "@/lib/actions";
import type { Prospect, Settings, Template } from "@/lib/types";
import { industryLabel, PLAYBOOK } from "@/lib/industries";
import { findCountry } from "@/lib/geo/countries";
import { ScoreRing, StagePill, btn, ago, Empty } from "@/components/ui";
import { Favicon } from "@/components/Favicon";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { PitchComposer } from "@/components/PitchComposer";
import { SharePanel } from "@/components/SharePanel";
import { IconArrowLeft, IconArrowRight, IconCheck, IconClock, IconEye, IconGlobe, IconMail, IconPhone, IconSearch, IconSparkle, IconStar, IconX, IconZap } from "@/components/icons";

export type QueueItem = { id: string; reason: "opened" | "due" | "new"; label: string; touches: number };

const REASON = {
  opened: { cls: "bg-accent text-accent-ink", icon: <IconEye className="h-3.5 w-3.5" /> },
  due: { cls: "bg-warning/15 text-warning", icon: <IconClock className="h-3.5 w-3.5" /> },
  new: { cls: "bg-brand/10 text-brand", icon: <IconSparkle className="h-3.5 w-3.5" /> },
};

const skipKey = () => `leadget-skip-${new Date().toISOString().slice(0, 10)}`;

/**
 * The daily routine as one screen. One lead at a time: why they're here,
 * what's wrong with their site, something to send them, and a message ready
 * to go. Log the send and the next lead slides in.
 *
 * Keyboard: → next · ← back · S skip for today.
 */
export function TodayQueue({
  items, prospects, settings, templates, ai, sentToday, goal,
}: { items: QueueItem[]; prospects: Prospect[]; settings: Settings; templates: Template[]; ai: boolean; sentToday: number; goal: number }) {
  const router = useRouter();
  const toast = useToast();
  // Freeze the order for the session, so logging a send doesn't reshuffle what's left.
  const [order, setOrder] = useState<QueueItem[]>(items);
  const [i, setI] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState(sentToday);
  const [busy, start] = useTransition();

  useEffect(() => {
    try {
      const skipped: string[] = JSON.parse(localStorage.getItem(skipKey()) ?? "[]");
      if (skipped.length) setOrder((o) => o.filter((x) => !skipped.includes(x.id)));
    } catch { /* no storage */ }
  }, []);

  const byId = useMemo(() => new Map(prospects.map((p) => [p.id, p])), [prospects]);
  const list = order.filter((x) => byId.has(x.id));
  const cur = list[i];
  const p = cur ? byId.get(cur.id)! : null;

  const next = useCallback(() => setI((n) => Math.min(n + 1, list.length)), [list.length]);
  const prev = useCallback(() => setI((n) => Math.max(n - 1, 0)), []);

  function skip() {
    if (!cur) return;
    try {
      const k = skipKey();
      const arr: string[] = JSON.parse(localStorage.getItem(k) ?? "[]");
      localStorage.setItem(k, JSON.stringify([...arr, cur.id]));
    } catch { /* no storage */ }
    setOrder((o) => o.filter((x) => x.id !== cur.id));
    toast("Skipped for today.");
  }

  function act(kind: "lost" | "snooze") {
    if (!cur) return;
    start(async () => {
      const r = kind === "lost" ? await setStage(cur.id, "lost") : await snooze(cur.id, 3);
      if (!r.ok) return toast(r.error, "error");
      toast(kind === "lost" ? "Marked as not a fit." : "Moved to 3 days from now.");
      setOrder((o) => o.filter((x) => x.id !== cur.id));
      router.refresh();
    });
  }

  function audit() {
    if (!p) return;
    start(async () => {
      const r = await runAudit(p.id);
      if (!r.ok) return toast(r.error, "error");
      toast(`Audit done — ${r.data.audit?.issues.length ?? 0} issues.`);
      router.refresh();
    });
  }

  function logged() {
    if (!cur) return;
    setDone((d) => new Set(d).add(cur.id));
    setSent((n) => n + 1);
    setTimeout(next, 700);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key.toLowerCase() === "s") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pct = Math.min(100, (sent / Math.max(goal, 1)) * 100);

  if (!list.length) {
    return (
      <>
        <Header sent={sent} goal={goal} pct={pct} pos={0} total={0} />
        <Empty icon={<IconCheck className="h-5 w-5" />} title="Nothing in today's queue"
          body="No follow-ups due and no uncontacted leads left. Find a new market and the queue fills itself."
          action={<Link href="/find" className={btn("accent")}><IconSearch /> Find leads</Link>} />
      </>
    );
  }

  if (!cur || !p) {
    return (
      <>
        <Header sent={sent} goal={goal} pct={pct} pos={list.length} total={list.length} />
        <div className="grain rounded-xl border border-dashed border-line-strong px-6 py-16 text-center animate-rise">
          <p className="display text-[2.2rem]">{sent >= goal ? "Goal hit. Nice work." : "That's the queue."}</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[13.5px] text-muted">
            {sent} message{sent === 1 ? "" : "s"} sent today{sent >= goal ? "" : ` — ${goal - sent} short of your goal. Add a fresh market to keep going`}.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => setI(0)} className={btn("secondary")}><IconArrowLeft /> Back to the start</button>
            <Link href="/find" className={btn("accent")}><IconSearch /> Find more leads</Link>
          </div>
        </div>
      </>
    );
  }

  const r = REASON[cur.reason];
  const issues = [...(p.audit?.issues ?? [])].sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity]);

  return (
    <>
      <Header sent={sent} goal={goal} pct={pct} pos={i + 1} total={list.length} />

      {/* Strip */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
        {list.map((x, n) => {
          const q = byId.get(x.id)!;
          return (
            <button key={x.id} onClick={() => setI(n)} title={`${q.name} — ${x.label}`}
              className={clsx("relative shrink-0 rounded-md transition", n === i ? "ring-2 ring-ink ring-offset-2 ring-offset-page" : "opacity-60 hover:opacity-100")}>
              <Favicon website={q.website} name={q.name} size={30} />
              {done.has(x.id) && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-success text-white"><IconCheck className="h-2.5 w-2.5" /></span>}
              {x.reason === "opened" && !done.has(x.id) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-page" />}
            </button>
          );
        })}
      </div>

      <div key={p.id} className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)] animate-rise">
        {/* Lead */}
        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="card p-5">
            <span className={clsx("inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11.5px] font-medium", r.cls)}>{r.icon}{cur.label}{cur.reason === "opened" && p.last_viewed_at ? ` · ${ago(p.last_viewed_at)}` : ""}</span>
            <div className="mt-4 flex items-start gap-3">
              <Favicon website={p.website} name={p.name} size={44} />
              <div className="min-w-0 flex-1">
                <Link href={`/prospects/${p.id}`} className="display block text-[1.35rem] leading-tight hover:underline">{p.name}</Link>
                <p className="mt-1 text-[12.5px] text-muted">{PLAYBOOK[p.industry]?.emoji} {industryLabel(p.industry)}{p.city ? ` · ${p.city}` : ""} {findCountry(p.country)?.flag}</p>
              </div>
              <ScoreRing score={p.score} size={40} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-muted">
              <StagePill stage={p.stage} />
              {p.rating != null && <span className="inline-flex items-center gap-1"><IconStar className="h-3.5 w-3.5 fill-warning text-warning" />{p.rating.toFixed(1)} ({p.reviews ?? 0})</span>}
              {cur.touches > 0 && <span>{cur.touches} touch{cur.touches === 1 ? "" : "es"} · last {ago(p.last_contacted_at)}</span>}
            </div>
            <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-[12.5px]">
              <li className="flex items-center gap-2"><IconMail className="h-3.5 w-3.5 text-faint" />{p.email || <span className="text-faint">No email</span>}</li>
              <li className="flex items-center gap-2"><IconPhone className="h-3.5 w-3.5 text-faint" />{p.phone || <span className="text-faint">No phone</span>}</li>
              <li className="flex items-center gap-2"><IconGlobe className="h-3.5 w-3.5 text-faint" />
                {p.website ? <a href={p.website} target="_blank" rel="noreferrer" className="truncate hover:underline">{p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : <span className="font-medium text-warning">No website</span>}
              </li>
            </ul>
          </div>

          {p.website && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold">What&apos;s wrong with the site</p>
                {!p.audit && <button onClick={audit} disabled={busy} className={btn("primary", "sm")}>{busy ? <Spinner className="h-3.5 w-3.5" /> : <IconGlobe className="h-3.5 w-3.5" />} Audit now</button>}
              </div>
              {p.audit ? (
                issues.length ? (
                  <ul className="mt-3 space-y-2.5">
                    {issues.slice(0, 4).map((x) => (
                      <li key={x.id} className="flex gap-2.5 text-[12.5px]">
                        <span className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", x.severity === "high" ? "bg-danger" : x.severity === "medium" ? "bg-warning" : "bg-faint")} />
                        <span><span className="font-medium">{x.title}</span></span>
                      </li>
                    ))}
                    {issues.length > 4 && <li className="text-[12px] text-muted">+{issues.length - 4} more</li>}
                  </ul>
                ) : <p className="mt-2 text-[12.5px] text-success">Looks fine — pitch a new feature, not a fix.</p>
              ) : <p className="mt-2 text-[12.5px] text-muted">Audit it first — you'll open with something true about their business.</p>}
            </div>
          )}
        </aside>

        {/* Work */}
        <div className="min-w-0 space-y-5">
          <SharePanel p={p} settings={settings} />
          <PitchComposer key={p.id} p={p} settings={settings} templates={templates.filter((t) => !t.industry || t.industry === p.industry)} ai={ai} touches={cur.touches} onLogged={logged} />
        </div>
      </div>

      {/* Controls */}
      <div className="sticky bottom-4 z-30 mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface/95 p-2 shadow-pop backdrop-blur">
        <button onClick={prev} disabled={i === 0} className={btn("ghost", "md")}><IconArrowLeft /> Back</button>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={skip} className={btn("ghost", "sm")} title="S">Skip for today</button>
          <button onClick={() => act("snooze")} disabled={busy} className={btn("ghost", "sm")}><IconClock className="h-3.5 w-3.5" /> In 3 days</button>
          <button onClick={() => act("lost")} disabled={busy} className={btn("ghost", "sm", "hover:!text-danger")}><IconX className="h-3.5 w-3.5" /> Not a fit</button>
        </div>
        <button onClick={next} className={btn(done.has(cur.id) ? "accent" : "primary", "md")}>{done.has(cur.id) ? "Next lead" : "Next"} <IconArrowRight /></button>
      </div>
    </>
  );
}

function Header({ sent, goal, pct, pos, total }: { sent: number; goal: number; pct: number; pos: number; total: number }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div>
        <p className="mono mb-2">Today · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="display text-[clamp(1.75rem,1.3rem+1.6vw,2.6rem)]">One lead at a time.</h1>
        <p className="mt-1 text-[13.5px] text-muted">{total ? `Lead ${Math.min(pos, total)} of ${total}` : "Empty queue"} · <kbd className="rounded border border-line px-1 font-mono text-[11px]">→</kbd> next · <kbd className="rounded border border-line px-1 font-mono text-[11px]">S</kbd> skip</p>
      </div>
      <div className="w-[min(320px,100%)]">
        <div className="flex items-baseline justify-between">
          <span className="mono">Sent today</span>
          <span className="display num text-[1.8rem] leading-none">{sent}<span className="text-[1rem] text-muted"> / {goal}</span></span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-page-alt">
          <div className={clsx("h-full rounded-full transition-all duration-700", pct >= 100 ? "bg-brand" : "bg-ink")} style={{ width: `${pct}%` }} />
        </div>
        {pct >= 100 && <p className="mt-1.5 flex items-center gap-1 text-[12px] text-brand"><IconZap className="h-3.5 w-3.5" /> Daily goal reached</p>}
      </div>
    </header>
  );
}
