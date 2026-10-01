"use client";

import { useEffect, useState, useTransition } from "react";
import clsx from "clsx";
import { saveReport } from "@/lib/actions";
import type { Grade, Impact, Prospect, ReportDoc, Settings } from "@/lib/types";
import { GRADES, buildReport, gradeFor, summaryFor } from "@/lib/kymaa/report";
import { KymaaReport } from "@/components/kymaa/KymaaReport";
import { ScaledPreview } from "@/components/kymaa/ScaledPreview";
import { Field, btn, inputCls } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconPlus, IconRefresh, IconTrash, IconX, IconArrowLeft } from "@/components/icons";

export const TEAM_PHOTOS = [
  { name: "Diwe Innocent", url: "/brand/photos/diwe-innocent.jpg" },
  { name: "Jeremiah Ndubuisi", url: "/brand/photos/jeremiah-ndubuisi.jpg" },
];

const HARD = /doesn.t load|returns an error|no https|placeholder|not a public web address/i;

/**
 * Edit the Kymaa website report before you send it: every word, the grade,
 * the order of the fixes, the plan and the sign-off. Live preview on the right.
 */
export function ReportEditor({ p, settings, onClose, onSaved }: { p: Prospect; settings: Settings; onClose: () => void; onSaved: (shareId: string) => void }) {
  const toast = useToast();
  const fresh = () => buildReport(p, settings);
  const [d, setD] = useState<ReportDoc>(() => (p.report ? { ...fresh(), ...p.report } : fresh()));
  const [auto, setAuto] = useState(() => !p.report);
  const [tab, setTab] = useState<"cover" | "fix" | "working" | "plan">("cover");
  const [saving, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  /** Change something; when auto-grading is on, keep grade, verdict and summary in step with the lists. */
  function up(patch: Partial<ReportDoc>) {
    setD((x) => {
      const n = { ...x, ...patch };
      if (!auto) return n;
      const total = n.issues.length + n.wins.length;
      const g = gradeFor(n.wins.length, total, n.issues.some((i) => HARD.test(i.title)));
      return { ...n, grade: g, verdict: GRADES[g].verdict, checksTotal: total, summary: summaryFor(n.business.name, n.issues.length, n.wins.length) };
    });
  }
  const setIssue = (i: number, v: Partial<ReportDoc["issues"][number]>) => up({ issues: d.issues.map((x, j) => (j === i ? { ...x, ...v } : x)) });
  const move = <T,>(arr: T[], i: number, by: number) => { const a = [...arr]; const [x] = a.splice(i, 1); a.splice(Math.max(0, Math.min(a.length, i + by)), 0, x); return a; };

  function save() {
    start(async () => {
      const r = await saveReport(p.id, d);
      if (!r.ok) return toast(r.error, "error");
      toast("Report saved.");
      onSaved(r.data.share_id);
    });
  }
  function reset() {
    if (!confirm("Throw away your edits and rebuild the report from the latest website check?")) return;
    setD(fresh());
    setAuto(true);
  }

  const TABS = [["cover", "Cover"], ["fix", `Fixes (${d.issues.length})`], ["working", `Working (${d.wins.length})`], ["plan", "Plan & sign-off"]] as const;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-page animate-rise" role="dialog" aria-modal="true" aria-label="Report editor">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-page-alt hover:text-ink" aria-label="Close"><IconX /></button>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">Website report · {p.name}</p>
            <p className="text-[11.5px] text-muted">{p.report ? "Your edited version" : "Written from the latest check"} — change anything, then save.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className={btn("ghost", "sm")}><IconRefresh className="h-3.5 w-3.5" /> Rebuild from check</button>
          <button onClick={save} disabled={saving} className={btn("primary", "md")}>{saving && <Spinner />}Save & preview</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[420px_1fr]">
        <div className="flex min-h-0 flex-col border-r border-line bg-surface">
          <div className="flex gap-1 border-b border-line px-3 py-2">
            {TABS.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={clsx("rounded-pill px-3 py-1.5 text-[12.5px] transition-colors", tab === k ? "bg-ink text-page" : "text-muted hover:bg-page-alt hover:text-ink")}>{l}</button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 scroll-thin">
            {tab === "cover" && (
              <>
                <Field label="Business name"><input className={inputCls} value={d.business.name} onChange={(e) => up({ business: { ...d.business, name: e.target.value } })} /></Field>
                <Field label="Website shown under the name"><input className={inputCls} value={d.business.domain} onChange={(e) => up({ business: { ...d.business, domain: e.target.value } })} /></Field>
                <Field label="Date checked"><input type="date" className={inputCls} value={d.checkedAt} onChange={(e) => up({ checkedAt: e.target.value })} /></Field>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[12px] font-medium">Grade</span>
                    <label className="flex items-center gap-1.5 text-[12px] text-muted">
                      <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); }} /> Grade automatically
                    </label>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(Object.keys(GRADES) as Grade[]).map((g) => (
                      <button key={g} onClick={() => { setAuto(false); setD((x) => ({ ...x, grade: g, verdict: GRADES[g].verdict })); }}
                        className={clsx("h-11 font-semibold text-white transition", d.grade === g ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "opacity-60 hover:opacity-100")}
                        style={{ background: GRADES[g].color, clipPath: "polygon(8px 0,100% 0,100% 100%,0 100%,0 8px)" }}>{g}</button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-faint">Auto: share of checks passed (90% A · 75% B · 60% C · 40% D). Site down or no HTTPS caps it at D.</p>
                </div>
                <Field label="Verdict"><input className={inputCls} value={d.verdict} onChange={(e) => { setAuto(false); setD((x) => ({ ...x, verdict: e.target.value })); }} /></Field>
                <Field label="Summary"><textarea rows={3} className={inputCls} value={d.summary} onChange={(e) => { setAuto(false); setD((x) => ({ ...x, summary: e.target.value })); }} /></Field>
                {p.audit?.pagespeed && (
                  <label className="flex items-start gap-2.5 rounded-md border border-line p-3 text-[12.5px]">
                    <input type="checkbox" className="mt-0.5" checked={d.showSpeed} onChange={(e) => up({ showSpeed: e.target.checked })} />
                    <span><b className="font-medium">Show the phone screenshot and Google speed</b><span className="block text-muted">Speed {p.audit.pagespeed.performance}/100 on mobile.</span></span>
                  </label>
                )}
              </>
            )}

            {tab === "fix" && (
              <>
                <p className="text-[12px] text-muted">Keep 3–7, most costly first. <b>Why</b> says what it costs them; <b>the fix</b> starts with a verb.</p>
                {d.issues.map((it, i) => (
                  <div key={i} className="rounded-lg border border-line p-3">
                    <div className="flex gap-2">
                      <span className="num w-6 shrink-0 pt-2 text-[12px] text-[#0060DF]">{String(i + 1).padStart(2, "0")}</span>
                      <input className={clsx(inputCls, "font-medium")} value={it.title} placeholder="What's wrong" onChange={(e) => setIssue(i, { title: e.target.value })} />
                    </div>
                    <div className="mt-2 flex gap-1 pl-8 text-[11.5px]">
                      {(["high", "medium", "low"] as Impact[]).map((k) => (
                        <button key={k} onClick={() => setIssue(i, { impact: k })}
                          className={clsx("rounded-pill px-2.5 py-1 capitalize", it.impact === k ? "bg-ink text-page" : "bg-page-alt text-muted hover:text-ink")}>{k}</button>
                      ))}
                      <span className="ml-auto flex gap-0.5">
                        <button disabled={i === 0} onClick={() => up({ issues: move(d.issues, i, -1) })} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-page-alt disabled:opacity-30" aria-label="Move up"><IconArrowLeft className="h-3.5 w-3.5 rotate-90" /></button>
                        <button disabled={i === d.issues.length - 1} onClick={() => up({ issues: move(d.issues, i, 1) })} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-page-alt disabled:opacity-30" aria-label="Move down"><IconArrowLeft className="h-3.5 w-3.5 -rotate-90" /></button>
                        <button onClick={() => up({ issues: d.issues.filter((_, j) => j !== i) })} className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-page-alt hover:text-danger" aria-label="Remove"><IconTrash className="h-3.5 w-3.5" /></button>
                      </span>
                    </div>
                    <div className="mt-2 space-y-2 pl-8">
                      <textarea rows={2} className={clsx(inputCls, "text-[12.5px]")} value={it.why} placeholder="Why it matters — what it costs them" onChange={(e) => setIssue(i, { why: e.target.value })} />
                      <textarea rows={2} className={clsx(inputCls, "text-[12.5px]")} value={it.fix} placeholder="The fix — one concrete action" onChange={(e) => setIssue(i, { fix: e.target.value })} />
                    </div>
                  </div>
                ))}
                <button onClick={() => up({ issues: [...d.issues, { title: "", impact: "medium", why: "", fix: "" }] })} className={btn("secondary", "sm")}><IconPlus className="h-3.5 w-3.5" /> Add a fix</button>
              </>
            )}

            {tab === "working" && (
              <>
                <p className="text-[12px] text-muted">Two to six things they're doing right — it makes the rest land better.</p>
                {d.wins.map((w, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex-1 space-y-1.5">
                      <input className={clsx(inputCls, "font-medium")} value={w.title} placeholder="What's working" onChange={(e) => up({ wins: d.wins.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                      <input className={clsx(inputCls, "text-[12.5px]")} value={w.detail} placeholder="Detail (optional)" onChange={(e) => up({ wins: d.wins.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)) })} />
                    </div>
                    <button onClick={() => up({ wins: d.wins.filter((_, j) => j !== i) })} className="grid w-9 shrink-0 place-items-center rounded-md text-faint hover:bg-page-alt hover:text-danger" aria-label="Remove"><IconTrash className="h-4 w-4" /></button>
                  </div>
                ))}
                <button onClick={() => up({ wins: [...d.wins, { title: "", detail: "" }] })} className={btn("secondary", "sm")}><IconPlus className="h-3.5 w-3.5" /> Add one</button>
              </>
            )}

            {tab === "plan" && (
              <>
                <Field label="Plan title"><input className={inputCls} value={d.planTitle} onChange={(e) => up({ planTitle: e.target.value })} /></Field>
                <div>
                  <p className="mb-1.5 text-[12px] font-medium">What you'd build <span className="font-normal text-faint">— 2–4, specific to their industry</span></p>
                  <div className="space-y-3">
                    {d.recommendations.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <div className="flex-1 space-y-1.5">
                          <input className={clsx(inputCls, "font-medium")} value={r.title} onChange={(e) => up({ recommendations: d.recommendations.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                          <input className={clsx(inputCls, "text-[12.5px]")} value={r.detail} placeholder="The outcome, in one line (optional)" onChange={(e) => up({ recommendations: d.recommendations.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)) })} />
                        </div>
                        <button onClick={() => up({ recommendations: d.recommendations.filter((_, j) => j !== i) })} className="grid w-9 shrink-0 place-items-center rounded-md text-faint hover:bg-page-alt hover:text-danger" aria-label="Remove"><IconTrash className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => up({ recommendations: [...d.recommendations, { title: "", detail: "" }] })} className={clsx(btn("secondary", "sm"), "mt-3")}><IconPlus className="h-3.5 w-3.5" /> Add</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prepared by"><input className={inputCls} value={d.preparer.name} onChange={(e) => up({ preparer: { ...d.preparer, name: e.target.value } })} /></Field>
                  <Field label="Role line"><input className={inputCls} value={d.preparer.role} onChange={(e) => up({ preparer: { ...d.preparer, role: e.target.value } })} /></Field>
                </div>
                <div>
                  <p className="mb-1.5 text-[12px] font-medium">Photo</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => up({ preparer: { ...d.preparer, photo: "" } })} className={clsx("grid h-12 w-12 place-items-center rounded-md border text-[11px] text-muted", !d.preparer.photo ? "border-ink" : "border-line")}>None</button>
                    {TEAM_PHOTOS.map((t) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <button key={t.url} onClick={() => up({ preparer: { ...d.preparer, photo: t.url, name: d.preparer.name || t.name } })} title={t.name} className={clsx("h-12 w-12 overflow-hidden rounded-md border-2", d.preparer.photo === t.url ? "border-ink" : "border-transparent")}><img src={t.url} alt={t.name} className="h-full w-full object-cover object-[50%_20%]" /></button>
                    ))}
                  </div>
                  <input className={clsx(inputCls, "mt-2 text-[12.5px]")} value={d.preparer.photo} placeholder="…or an image URL" onChange={(e) => up({ preparer: { ...d.preparer, photo: e.target.value } })} />
                </div>
                <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                  <Field label="Main button"><input className={inputCls} value={d.cta.primary.label} onChange={(e) => up({ cta: { ...d.cta, primary: { ...d.cta.primary, label: e.target.value } } })} /></Field>
                  <Field label="Link"><input className={inputCls} value={d.cta.primary.url} placeholder="https://wa.me/…" onChange={(e) => up({ cta: { ...d.cta, primary: { ...d.cta.primary, url: e.target.value } } })} /></Field>
                  <Field label="Second button"><input className={inputCls} value={d.cta.secondary?.label ?? ""} placeholder="Optional" onChange={(e) => up({ cta: { ...d.cta, secondary: { url: d.cta.secondary?.url ?? "", label: e.target.value } } })} /></Field>
                  <Field label="Link"><input className={inputCls} value={d.cta.secondary?.url ?? ""} placeholder="https://…" onChange={(e) => up({ cta: { ...d.cta, secondary: { label: d.cta.secondary?.label ?? "", url: e.target.value } } })} /></Field>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-[#E9E6DD] p-4 scroll-thin sm:p-6">
          <ScaledPreview width={880}>
            <div className="pointer-events-none"><KymaaReport d={d} speed={p.audit?.pagespeed} brand={settings.business_name} site={settings.website} fixed /></div>
          </ScaledPreview>
        </div>
      </div>
    </div>
  );
}
