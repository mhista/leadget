"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { generatePitch, logOutreach, pitchFromTemplate } from "@/lib/actions";
import type { Pitch, Prospect, Settings, Template } from "@/lib/types";
import { SWIPE, type Swipe } from "@/lib/swipe";
import { suggestAngles } from "@/lib/suggest";
import { brackets, renderTemplate } from "@/lib/render";
import { gmailLink, linkedinSearch, mailtoLink, outlookLink, whatsappLink } from "@/lib/links";
import { btn, inputCls, selectCls, Notice } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/Modal";
import { SwipeLibrary } from "@/components/SwipeLibrary";
import { shareBase } from "@/components/SharePanel";
import { IconChat, IconCheck, IconCopy, IconExternal, IconLinkedin, IconMail, IconRefresh, IconSparkle, IconClock, IconFile, IconArrowRight } from "@/components/icons";

type Tab = "email" | "whatsapp" | "followups";
type Draft = { subject: string; body: string; whatsapp: string; followups: Pitch["followups"]; by?: Pitch["by"] | "template"; angle?: string };

/**
 * Where a pitch gets written, edited and sent.
 *
 * Three ways in: the suggested angles for this lead (one click, filled in),
 * the whole swipe file, or "Write my pitch" (AI or playbook). Whatever you
 * start from, [square brackets] mark what only you can write — the composer
 * counts them, jumps to the next one, and won't open Gmail while any remain.
 *
 * The draft is kept in this browser per prospect.
 */
export function PitchComposer({
  p, settings, templates, ai, touches, initialAngle, onLogged,
}: { p: Prospect; settings: Settings; templates: Template[]; ai: boolean; touches: number; initialAngle?: string; onLogged?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const key = `leadget-draft-${p.id}`;
  const [tab, setTab] = useState<Tab>("email");
  const [d, setD] = useState<Draft>({ subject: "", body: "", whatsapp: "", followups: [] });
  const [angle, setAngle] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [writing, startWrite] = useTransition();
  const [logging, startLog] = useTransition();
  const [justOpened, setJustOpened] = useState<null | "email" | "whatsapp" | "linkedin">(null);
  const [followIn, setFollowIn] = useState(3);
  const [library, setLibrary] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const waRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(() => suggestAngles(p, touches, 4), [p, touches]);

  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setD(JSON.parse(s)); } catch { /* no storage */ }
    // Arrived by clicking a suggested angle? Start from it.
    if (initialAngle && SWIPE[initialAngle]) applySwipe(SWIPE[initialAngle]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    try { if (d.body || d.whatsapp) localStorage.setItem(key, JSON.stringify(d)); } catch { /* no storage */ }
  }, [d, key]);

  const hasDraft = !!(d.body || d.whatsapp);
  const noProfile = !settings.your_name;
  const blanksEmail = brackets(`${d.subject}\n${d.body}`);
  const blanksWa = brackets(d.whatsapp);

  function write(swipeId?: string) {
    setWarning(null);
    startWrite(async () => {
      const r = await generatePitch(p.id, angle || undefined, swipeId);
      if (!r.ok) return toast(r.error, "error");
      const { warning: w, ...pitch } = r.data as Pitch & { warning?: string };
      setD({ ...pitch, angle: swipeId ? SWIPE[swipeId]?.angle : undefined });
      setTab("email");
      if (w) setWarning(w);
    });
  }

  function applySwipe(s: Swipe) {
    const r = renderTemplate(s, p, { ...settings, public_url: shareBase(settings) });
    if (s.channel === "email") {
      setD((x) => ({ ...x, subject: r.subject, body: r.body, by: "template", angle: s.angle }));
      setTab("email");
    } else {
      setD((x) => ({ ...x, whatsapp: r.body, by: "template", angle: s.angle }));
      setTab("whatsapp");
    }
    setLibrary(false);
    setTimeout(() => jumpToBlank(s.channel === "email" ? "email" : "whatsapp"), 60);
  }

  function applyTemplate(id: string) {
    if (!id) return;
    startWrite(async () => {
      const r = await pitchFromTemplate(p.id, id);
      if (!r.ok) return toast(r.error, "error");
      const t = templates.find((x) => x.id === id);
      if (t?.channel !== "email") { setD((x) => ({ ...x, whatsapp: r.data.body, by: "template", angle: t?.name })); setTab("whatsapp"); }
      else { setD((x) => ({ ...x, subject: r.data.subject, body: r.data.body, by: "template", angle: t?.name })); setTab("email"); }
    });
  }

  /** Select the next [bracket] so typing replaces it. */
  function jumpToBlank(which: "email" | "whatsapp" = tab === "whatsapp" ? "whatsapp" : "email") {
    const el = which === "email" ? bodyRef.current : waRef.current;
    if (!el) return;
    const text = el.value;
    const list = brackets(text);
    if (!list.length) return;
    const from = el.selectionEnd ?? 0;
    const next = list.find((b) => b.index >= from) ?? list[0];
    el.focus();
    el.setSelectionRange(next.index, next.index + next.text.length);
    // scroll the selection into view
    const lines = text.slice(0, next.index).split("\n").length;
    el.scrollTop = Math.max(0, (lines - 3) * 20);
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast("Copied."); } catch { toast("Couldn't copy — select the text instead.", "error"); }
  }

  function open(channel: "email" | "whatsapp" | "linkedin", url: string) {
    const blanks = channel === "email" ? blanksEmail : blanksWa;
    if (blanks.length) {
      toast(`Fill in ${blanks.length} [bracket]${blanks.length === 1 ? "" : "s"} first — they'd go out as-is.`, "error");
      jumpToBlank(channel === "email" ? "email" : "whatsapp");
      return;
    }
    window.open(url, "_blank", "noopener");
    setJustOpened(channel);
  }

  function markSent() {
    const channel = justOpened ?? (tab === "whatsapp" ? "whatsapp" : "email");
    const tagLine = d.angle ? ` [${d.angle}]` : "";
    const summary = channel === "email" ? `Email${tagLine}: ${d.subject}\n\n${d.body}` : channel === "whatsapp" ? `WhatsApp${tagLine}: ${d.whatsapp}` : `LinkedIn message${tagLine}: ${d.whatsapp || d.body}`;
    startLog(async () => {
      const r = await logOutreach(p.id, channel, summary, followIn || null);
      if (!r.ok) return toast(r.error, "error");
      toast(followIn ? `Logged. Follow-up booked in ${followIn} days.` : "Logged.");
      setJustOpened(null);
      try { localStorage.removeItem(key); } catch { /* no storage */ }
      router.refresh();
      onLogged?.();
    });
  }

  const BlankBar = ({ n, which }: { n: number; which: "email" | "whatsapp" }) =>
    n > 0 ? (
      <button type="button" onClick={() => jumpToBlank(which)} className="inline-flex items-center gap-1.5 rounded-pill bg-warning/15 px-2.5 py-1 text-[11.5px] font-medium text-warning hover:bg-warning/25">
        {n} fill-in{n === 1 ? "" : "s"} left · next <IconArrowRight className="h-3 w-3" />
      </button>
    ) : null;

  return (
    <section className="card overflow-hidden animate-rise [animation-delay:60ms]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-ink"><IconSparkle /></span>
          <div>
            <h2 className="text-[13.5px] font-semibold">Pitch {touches > 0 && <span className="font-normal text-muted">· touch #{touches + 1}</span>}</h2>
            <p className="text-[12px] text-muted">{ai ? "Start from an angle, or let AI write it from the audit" : "Start from an angle, or write it from the audit and playbook"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-pill bg-page-alt p-1 text-[12px]">
          {([["email", "Email"], ["whatsapp", "WhatsApp / DM"], ["followups", `Follow-ups${d.followups.length ? ` · ${d.followups.length}` : ""}`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={clsx("rounded-pill px-3 py-1 transition-colors", tab === k ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}>{l}</button>
          ))}
        </div>
      </div>

      {/* Suggested angles */}
      {suggestions.length > 0 && (
        <div className="border-b border-line px-5 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="mono">Suggested for this lead</p>
            <button onClick={() => setLibrary(true)} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink"><IconFile className="h-3.5 w-3.5" /> Browse all {Object.keys(SWIPE).length} angles</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map(({ swipe, reason }) => (
              <div key={swipe.id} className="group flex items-stretch overflow-hidden rounded-lg border border-line transition-colors hover:border-ink/30">
                <button onClick={() => applySwipe(swipe)} className="min-w-0 flex-1 px-3 py-2 text-left hover:bg-sunken" title={swipe.guidance}>
                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                    {swipe.channel === "whatsapp" ? <IconChat className="h-3.5 w-3.5 text-faint" /> : swipe.channel === "linkedin" ? <IconLinkedin className="h-3.5 w-3.5 text-faint" /> : <IconMail className="h-3.5 w-3.5 text-faint" />}
                    <span className="truncate">{swipe.angle}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted">{reason}</span>
                </button>
                {ai && swipe.channel === "email" && (
                  <button onClick={() => write(swipe.id)} disabled={writing} title="Let AI write it in this angle" className="grid w-10 shrink-0 place-items-center border-l border-line text-muted hover:bg-accent/20 hover:text-ink">
                    <IconSparkle className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken px-5 py-3">
        <input value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="Extra direction (optional) — e.g. mention I'm in Lagos too" className={clsx(inputCls, "min-w-[220px] flex-1 bg-surface")} />
        {templates.length > 0 && (
          <select defaultValue="" onChange={(e) => { applyTemplate(e.target.value); e.target.value = ""; }} className={clsx(selectCls, "!w-auto bg-surface")}>
            <option value="">My templates…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <button onClick={() => write()} disabled={writing} className={btn(hasDraft ? "secondary" : "accent", "md")}>
          {writing ? <Spinner /> : hasDraft ? <IconRefresh /> : <IconSparkle />}
          {writing ? "Writing…" : hasDraft ? "Rewrite" : "Write my pitch"}
        </button>
      </div>

      <div className="p-5">
        {noProfile && !hasDraft && (
          <div className="mb-4"><Notice tone="warning">Add your name, services and some proof in <a href="/settings" className="underline underline-offset-2">Settings</a> first — pitches read much better when they know who&apos;s sending them.</Notice></div>
        )}
        {warning && <div className="mb-4"><Notice tone="warning">{warning}</Notice></div>}

        {writing && !hasDraft ? (
          <div className="space-y-2.5">
            <div className="skeleton h-9" />
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton h-4" style={{ width: `${[92, 100, 85, 97, 60, 90, 40][i]}%` }} />)}
          </div>
        ) : !hasDraft ? (
          <div className="py-8 text-center">
            <p className="display text-[1.35rem]">One specific thing, one fix, one small ask.</p>
            <p className="mx-auto mt-2 max-w-[52ch] text-[13px] text-muted">
              {p.audit || !p.website
                ? "Pick a suggested angle above, or press “Write my pitch”. Edit anything that doesn't sound like you."
                : "Tip: audit their website first (below) — the pitch will open with something true about their business instead of a generic line."}
            </p>
          </div>
        ) : tab === "email" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="w-14 shrink-0 text-muted">To</span>
              <span className={clsx("truncate", !p.email && "text-warning")}>{p.email || "No email yet — add one, or send on WhatsApp/LinkedIn instead"}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {d.angle && <span className="rounded-pill bg-brand/10 px-2 py-0.5 text-[11px] text-brand">{d.angle}</span>}
                {d.by && <span className="rounded-pill bg-page-alt px-2 py-0.5 text-[11px] text-muted">{d.by === "ai" ? "AI draft" : d.by === "template" ? "From template" : "Playbook draft"}</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[12.5px] text-muted">Subject</span>
              <input value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })} className={clsx(inputCls, "font-medium")} />
            </div>
            <textarea ref={bodyRef} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} rows={14} className={clsx(inputCls, "resize-y font-body leading-relaxed")} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[12px] text-faint">
                <BlankBar n={blanksEmail.length} which="email" />
                {d.body.split(/\s+/).filter(Boolean).length} words · aim for under 130
              </span>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copy(`${d.subject}\n\n${d.body}`)} className={btn("ghost", "sm")}><IconCopy className="h-3.5 w-3.5" /> Copy</button>
                <button onClick={() => open("email", mailtoLink(p.email, d.subject, d.body))} className={btn("secondary", "sm")}>Mail app</button>
                <button onClick={() => open("email", outlookLink(p.email, d.subject, d.body))} className={btn("secondary", "sm")}>Outlook</button>
                <button onClick={() => open("email", gmailLink(p.email, d.subject, d.body))} className={btn("primary", "sm")}><IconMail className="h-3.5 w-3.5" /> Open in Gmail</button>
              </div>
            </div>
          </div>
        ) : tab === "whatsapp" ? (
          <div className="space-y-3">
            <textarea ref={waRef} value={d.whatsapp} onChange={(e) => setD({ ...d, whatsapp: e.target.value })} rows={5} className={clsx(inputCls, "resize-y leading-relaxed")} placeholder="Short message for WhatsApp, Instagram or LinkedIn" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BlankBar n={blanksWa.length} which="whatsapp" />
              <div className="ml-auto flex flex-wrap gap-2">
                <button onClick={() => copy(d.whatsapp)} className={btn("ghost", "sm")}><IconCopy className="h-3.5 w-3.5" /> Copy</button>
                <button onClick={() => { copy(d.whatsapp); open("linkedin", p.linkedin || linkedinSearch(p.name)); }} className={btn("secondary", "sm")}><IconLinkedin className="h-3.5 w-3.5" /> Copy &amp; open LinkedIn</button>
                <button disabled={!p.phone} onClick={() => open("whatsapp", whatsappLink(p.phone, p.country, d.whatsapp))} className={btn("primary", "sm", "!bg-[#1FA855] !text-white")}><IconChat className="h-3.5 w-3.5" /> {p.phone ? "Open WhatsApp" : "No phone number"}</button>
              </div>
            </div>
          </div>
        ) : (
          <ol className="space-y-3">
            {d.followups.length === 0 && <p className="text-[13px] text-muted">Write a pitch to get a 3-step follow-up sequence — or pick a follow-up angle from the swipe file.</p>}
            {d.followups.map((f, i) => (
              <li key={i} className="rounded-lg border border-line p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[12.5px] font-medium"><span className="grid h-6 w-6 place-items-center rounded-full bg-page-alt text-[11px]">{i + 2}</span>Day {f.day} · {f.subject}</p>
                  <button onClick={() => { setD({ ...d, subject: f.subject, body: f.body, angle: `Follow-up day ${f.day}` }); setTab("email"); }} className={btn("secondary", "sm")}>Use this</button>
                </div>
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">{f.body}</p>
              </li>
            ))}
          </ol>
        )}

        {justOpened && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-brand/30 bg-brand/[.06] px-4 py-3 text-[13px] animate-rise">
            <IconExternal className="h-4 w-4 text-brand" />
            <span className="flex-1">Sent it? Log it so Leadget can remind you to follow up.</span>
            <span className="flex items-center gap-1.5 text-muted"><IconClock className="h-3.5 w-3.5" />Follow up in
              <select value={followIn} onChange={(e) => setFollowIn(Number(e.target.value))} className={clsx(selectCls, "h-8 !w-auto py-0 text-[12.5px]")}>
                {[2, 3, 5, 7, 14].map((n) => <option key={n} value={n}>{n} days</option>)}
                <option value={0}>No reminder</option>
              </select>
            </span>
            <button onClick={markSent} disabled={logging} className={btn("brand", "sm")}>{logging ? <Spinner className="h-3.5 w-3.5" /> : <IconCheck className="h-3.5 w-3.5" />} Yes, log it</button>
            <button onClick={() => setJustOpened(null)} className="text-[12px] text-muted hover:text-ink">Not yet</button>
          </div>
        )}
      </div>

      <Modal open={library} onClose={() => setLibrary(false)} title="Swipe file" description={`Every angle, already filled in for ${p.name}. Highlighted parts are yours to write.`} wide>
        <SwipeLibrary prospect={p} settings={{ ...settings, public_url: typeof window !== "undefined" ? shareBase(settings) : "" }} compact highlight={suggestions.map((s) => s.swipe.id)}
          onUse={applySwipe} onAi={ai ? (s) => { setLibrary(false); write(s.id); } : undefined} />
      </Modal>
    </section>
  );
}
