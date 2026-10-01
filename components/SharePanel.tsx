"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { prepareReport, runSpeedTest } from "@/lib/actions";
import type { Prospect, Settings } from "@/lib/types";
import { THEME } from "@/lib/mockup";
import { btn, ago } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { MockupEditor } from "@/components/MockupEditor";
import { ReportEditor } from "@/components/kymaa/ReportEditor";
import { IconCopy, IconExternal, IconFile, IconGauge, IconGlobe, IconSparkle, IconEdit } from "@/components/icons";

/** Where share links point: your deployed address if set, otherwise this browser's. */
export function shareBase(settings: Settings) {
  if (settings.public_url) return settings.public_url.replace(/\/$/, "");
  return typeof window !== "undefined" ? window.location.origin : "";
}

/**
 * "Send them something": the two value-first assets — a website report for
 * businesses with a site, a mock-up for anyone — each one link, tracked.
 */
export function SharePanel({ p, settings }: { p: Prospect; settings: Settings }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  const [busy, start] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const base = mounted ? shareBase(settings) : "";
  const local = mounted && /^https?:\/\/(localhost|127\.|192\.168\.)/.test(base);
  const reportUrl = p.share_id && p.audit ? `${base}/r/${p.share_id}` : null;
  const mockupUrl = p.share_id && p.mockup ? `${base}/m/${p.share_id}` : null;

  function copy(url: string) {
    navigator.clipboard?.writeText(url).then(() => toast(local ? "Copied — note this link only opens on your computer until Leadget is deployed." : "Link copied."));
  }

  function makeReport() {
    start(async () => {
      const r = await prepareReport(p.id);
      if (!r.ok) return toast(r.error, "error");
      if (r.data.warning) toast(r.data.warning, "error");
      window.open(`/r/${r.data.share_id}?preview=1`, "_blank");
      router.refresh();
    });
  }

  function speed() {
    start(async () => {
      const r = await runSpeedTest(p.id);
      if (!r.ok) return toast(r.error, "error");
      toast(`Google speed score: ${r.data.audit?.pagespeed?.performance}/100 on mobile.`);
      router.refresh();
    });
  }

  const ps = p.audit?.pagespeed;
  const theme = p.mockup ? THEME[p.mockup.theme] : null;

  return (
    <section className="card overflow-hidden animate-rise [animation-delay:40ms]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-[13.5px] font-semibold">Send them something first</h2>
          <p className="text-[12px] text-muted">A link they can open beats a paragraph they have to believe. Opens are tracked.</p>
        </div>
        {p.views > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent/20 px-2.5 py-1 text-[12px] font-medium">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> Opened {p.views}× · {ago(p.last_viewed_at)}
          </span>
        )}
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-2">
        {/* Report */}
        <div className="flex flex-col bg-surface p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-page-alt"><IconFile /></span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">Website report</p>
              <p className="text-[12px] leading-snug text-muted">
                {!p.website ? "They have no website — send a mock-up instead." : reportUrl ? `Graded ${p.audit?.issues.length ?? 0} issues${ps ? ` · speed ${ps.performance}/100` : ""}. ${p.report ? "Edited" : "Ready"} to share.` : "A graded check of their site in your Kymaa design, with the fixes and your plan."}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {p.website && (reportUrl ? (
              <>
                <button onClick={() => copy(reportUrl)} className={btn("primary", "sm")}><IconCopy className="h-3.5 w-3.5" /> Copy link</button>
                <a href={`/r/${p.share_id}?preview=1`} target="_blank" rel="noreferrer" className={btn("secondary", "sm")}><IconExternal className="h-3.5 w-3.5" /> Open</a>
                <button onClick={() => setEditingReport(true)} className={btn("ghost", "sm")}><IconEdit className="h-3.5 w-3.5" /> Edit</button>
                {!ps && p.audit?.reachable && <button onClick={speed} disabled={busy} className={btn("ghost", "sm")}>{busy ? <Spinner className="h-3.5 w-3.5" /> : <IconGauge className="h-3.5 w-3.5" />} Add speed test</button>}
              </>
            ) : (
              <button onClick={makeReport} disabled={busy} className={btn("primary", "sm")}>
                {busy ? <><Spinner className="h-3.5 w-3.5" /> Checking the site (up to a minute)…</> : <><IconGlobe className="h-3.5 w-3.5" /> Make the report</>}
              </button>
            ))}
          </div>
        </div>

        {/* Mock-up */}
        <div className={clsx("flex flex-col bg-surface p-5", !p.website && "bg-accent/[.06]")}>
          <div className="flex items-start gap-3">
            {theme ? (
              <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                <span className="flex-[2]" style={{ background: theme.hero }} /><span className="flex-1" style={{ background: theme.accent }} />
              </span>
            ) : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink"><IconSparkle /></span>}
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">Website mock-up {!p.website && <span className="ml-1 rounded-pill bg-accent px-1.5 py-[1px] text-[10px] font-semibold text-accent-ink">Best move</span>}</p>
              <p className="text-[12px] leading-snug text-muted">
                {p.mockup ? `${theme?.name ?? ""} theme · edited ${ago(p.mockup.updated_at)}.` : `A one-page site for ${p.name}, written and designed in a minute. Your "free mock-up" offer, already done.`}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {mockupUrl ? (
              <>
                <button onClick={() => copy(mockupUrl)} className={btn("primary", "sm")}><IconCopy className="h-3.5 w-3.5" /> Copy link</button>
                <a href={`/m/${p.share_id}?preview=1`} target="_blank" rel="noreferrer" className={btn("secondary", "sm")}><IconExternal className="h-3.5 w-3.5" /> Open</a>
                <button onClick={() => setEditing(true)} className={btn("ghost", "sm")}><IconEdit className="h-3.5 w-3.5" /> Edit</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className={btn("accent", "sm")}><IconSparkle className="h-3.5 w-3.5" /> Make a mock-up</button>
            )}
          </div>
        </div>
      </div>

      {local && (reportUrl || mockupUrl) && (
        <p className="border-t border-line bg-sunken px-5 py-2.5 text-[11.5px] text-muted">
          Running on your computer, so links only open here. Use <b>Save as image / PDF</b> on the preview to attach it, or deploy Leadget and set its address in Settings to share real links.
        </p>
      )}

      {editingReport && mounted && createPortal(
        <ReportEditor p={p} settings={settings} onClose={() => setEditingReport(false)}
          onSaved={(id) => { setEditingReport(false); router.refresh(); window.open(`/r/${id}?preview=1`, "_blank"); }} />,
        document.body,
      )}

      {editing && mounted && createPortal(
        <MockupEditor p={p} settings={settings} onClose={() => setEditing(false)}
          onSaved={(id) => { setEditing(false); router.refresh(); window.open(`/m/${id}?preview=1`, "_blank"); }} />,
        document.body,
      )}
    </section>
  );
}
