"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { saveMockup } from "@/lib/actions";
import type { Mockup, Prospect, Settings } from "@/lib/types";
import { THEMES, defaultMockup } from "@/lib/mockup";
import { MockupSite } from "@/components/MockupSite";
import { Field, btn, inputCls } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconPlus, IconRefresh, IconTrash, IconX } from "@/components/icons";

/**
 * Full-screen editor: the form on the left, the live site on the right,
 * scaled to fit. Everything starts pre-written for the industry; change what
 * you know better (their real services, a sharper headline) and save.
 */
export function MockupEditor({ p, settings, onClose, onSaved }: { p: Prospect; settings: Settings; onClose: () => void; onSaved: (shareId: string) => void }) {
  const toast = useToast();
  const [m, setM] = useState<Mockup>(p.mockup ?? defaultMockup(p));
  const [saving, start] = useTransition();
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const set = <K extends keyof Mockup>(k: K, v: Mockup[K]) => setM((x) => ({ ...x, [k]: v }));

  function save() {
    start(async () => {
      const r = await saveMockup(p.id, m);
      if (!r.ok) return toast(r.error, "error");
      toast("Mock-up saved.");
      onSaved(r.data.share_id);
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-page animate-rise" role="dialog" aria-modal="true" aria-label="Mock-up editor">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-page-alt hover:text-ink" aria-label="Close"><IconX /></button>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">Mock-up for {p.name}</p>
            <p className="text-[11.5px] text-muted">Pre-written for {p.industry.replace("-", " ")} — edit anything, then save and share.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setM({ ...defaultMockup(p), theme: m.theme })} className={btn("ghost", "sm")}><IconRefresh className="h-3.5 w-3.5" /> Reset copy</button>
          <button onClick={save} disabled={saving} className={btn("accent", "md")}>{saving && <Spinner />}Save mock-up</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
        {/* Form */}
        <div className="min-h-0 space-y-5 overflow-y-auto border-r border-line bg-surface p-5 scroll-thin">
          <div>
            <p className="mb-2 text-[12px] font-medium">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => set("theme", t.id)}
                  className={clsx("overflow-hidden rounded-lg border-2 text-left transition", m.theme === t.id ? "border-ink" : "border-transparent hover:border-line-strong")}>
                  <span className="flex h-10">
                    <span className="flex-[2]" style={{ background: t.hero }} />
                    <span className="flex-1" style={{ background: t.accent }} />
                    <span className="flex-1" style={{ background: t.bg }} />
                  </span>
                  <span className="block bg-page-alt px-2 py-1 text-[11px]">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label="Headline"><input className={inputCls} value={m.headline} onChange={(e) => set("headline", e.target.value)} /></Field>
          <Field label="Tagline"><textarea rows={3} className={inputCls} value={m.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
          <Field label="Main button">
            <div className="flex gap-1 rounded-pill bg-page-alt p-1 text-[12px]">
              {([["whatsapp", "WhatsApp"], ["call", "Call"], ["email", "Email"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => set("cta", k)} className={clsx("flex-1 rounded-pill py-1 transition-colors", m.cta === k ? "bg-surface text-ink shadow-soft" : "text-muted")}>{l}</button>
              ))}
            </div>
          </Field>
          <div>
            <p className="mb-2 text-[12px] font-medium">Highlights</p>
            <div className="space-y-2">
              {m.highlights.map((h, i) => (
                <input key={i} className={inputCls} value={h} onChange={(e) => set("highlights", m.highlights.map((x, j) => (j === i ? e.target.value : x)))} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-medium">Services</p>
              {m.services.length < 8 && <button onClick={() => set("services", [...m.services, { title: "", body: "" }])} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink"><IconPlus className="h-3 w-3" /> Add</button>}
            </div>
            <div className="space-y-3">
              {m.services.map((sv, i) => (
                <div key={i} className="rounded-lg border border-line p-3">
                  <div className="flex gap-2">
                    <input className={clsx(inputCls, "font-medium")} value={sv.title} placeholder="Service" onChange={(e) => set("services", m.services.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <button onClick={() => set("services", m.services.filter((_, j) => j !== i))} className="grid w-9 shrink-0 place-items-center rounded-md text-faint hover:bg-page-alt hover:text-danger" aria-label="Remove service"><IconTrash className="h-4 w-4" /></button>
                  </div>
                  <textarea rows={2} className={clsx(inputCls, "mt-2 text-[12.5px]")} value={sv.body} placeholder="One line on what they get" onChange={(e) => set("services", m.services.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
                </div>
              ))}
            </div>
          </div>
          <Field label="About"><textarea rows={4} className={inputCls} value={m.about} onChange={(e) => set("about", e.target.value)} /></Field>
          <p className="rounded-md bg-page-alt p-3 text-[11.5px] leading-relaxed text-muted">
            Only real facts go on the page automatically: their name, city, address, phone and Google rating. Anything in [brackets] is a placeholder for you to replace.
          </p>
        </div>

        {/* Preview */}
        <div className="flex min-h-0 flex-col bg-page-alt">
          <p className="p-3 text-center text-[12px] text-muted">Live preview · the shared page adapts to phones automatically</p>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 scroll-thin">
            <div ref={frame} className="mx-auto max-w-[1100px] overflow-hidden rounded-xl border border-line bg-white shadow-lift">
              <div style={{ width: 1280, transform: `scale(${scale})`, transformOrigin: "top left", height: 0 }}>
                <div className="pointer-events-none"><MockupSite p={p} m={m} s={settings} preview /></div>
              </div>
              <ScaledHeight scale={scale} width={1280} deps={[m]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The scaled preview takes no layout space by itself; this reserves it. */
function ScaledHeight({ scale, width, deps }: { scale: number; width: number; deps: unknown[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(800);
  useEffect(() => {
    const el = ref.current?.previousElementSibling?.firstElementChild as HTMLElement | null;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.scrollHeight));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, ...deps]);
  return <div ref={ref} style={{ height: h * scale }} />;
}
