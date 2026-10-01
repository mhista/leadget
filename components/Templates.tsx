"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { deleteTemplate, saveTemplate } from "@/lib/actions";
import type { Template } from "@/lib/types";
import { PLAYBOOKS, industryLabel } from "@/lib/industries";
import { Field, btn, inputCls, selectCls } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconChat, IconEdit, IconFile, IconLinkedin, IconMail, IconPlus, IconTrash } from "@/components/icons";
import { SwipeLibrary, highlightFill } from "@/components/SwipeLibrary";

type Draft = Omit<Template, "id" | "created_at"> & { id?: string };


const CH = { email: <IconMail className="h-3.5 w-3.5" />, whatsapp: <IconChat className="h-3.5 w-3.5" />, linkedin: <IconLinkedin className="h-3.5 w-3.5" /> };

export function Templates({ templates, vars }: { templates: Template[]; vars: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [busy, start] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function save() {
    if (!edit) return;
    start(async () => {
      const r = await saveTemplate(edit);
      if (!r.ok) return toast(r.error, "error");
      toast("Template saved.");
      setEdit(null);
      router.refresh();
    });
  }

  function insert(v: string) {
    if (!edit) return;
    const el = bodyRef.current;
    const token = `{{${v}}}`;
    if (!el) return setEdit({ ...edit, body: edit.body + token });
    const s = el.selectionStart, e = el.selectionEnd;
    const body = edit.body.slice(0, s) + token + edit.body.slice(e);
    setEdit({ ...edit, body });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={() => setEdit({ name: "", industry: "", channel: "email", subject: "", body: "" })} className={btn("primary")}><IconPlus /> New template</button>
      </div>

      {templates.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t, i) => (
            <article key={t.id} className="card group flex flex-col p-5 animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-semibold">{t.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">{CH[t.channel]} {t.channel === "email" ? "Email" : t.channel === "whatsapp" ? "WhatsApp" : "LinkedIn"} · {t.industry ? industryLabel(t.industry) : "Any industry"}{t.category ? ` · ${t.category}` : ""}</p>
                </div>
                <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setEdit(t)} className={btn("ghost", "icon")} aria-label="Edit"><IconEdit /></button>
                  <button onClick={() => confirm(`Delete “${t.name}”?`) && start(async () => { await deleteTemplate(t.id); router.refresh(); })} className={btn("ghost", "icon", "hover:!text-danger")} aria-label="Delete"><IconTrash /></button>
                </div>
              </div>
              {t.subject && <p className="mt-3 truncate text-[12.5px] font-medium">{t.subject}</p>}
              <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">{highlightFill(t.body)}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="grain rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
          <IconFile className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-3 text-[13.5px] font-medium">No templates yet</p>
          <p className="mt-1 text-[12.5px] text-muted">Save angles from the swipe file below, or write your own.</p>
        </div>
      )}

      <section id="swipe" className="animate-rise">
        <h2 className="display text-[1.5rem]">Swipe file</h2>
        <p className="mb-4 mt-1 max-w-[70ch] text-[13px] text-muted">
          Angles that don't read like cold email, written for selling websites and apps. Open one to see it, save it to your templates to make it yours.
          <span className="text-warning"> [Highlighted brackets]</span> are the parts only you can write.
        </p>
        <SwipeLibrary onSave={(sw) => setEdit({ name: sw.angle, industry: "", channel: sw.channel, subject: sw.subject, body: sw.body, category: sw.category })} />
      </section>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit template" : "New template"} wide>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name" className="sm:col-span-1"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Channel">
                <select className={selectCls} value={edit.channel} onChange={(e) => setEdit({ ...edit, channel: e.target.value as Template["channel"] })}>
                  <option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="linkedin">LinkedIn</option>
                </select>
              </Field>
              <Field label="Industry">
                <select className={selectCls} value={edit.industry} onChange={(e) => setEdit({ ...edit, industry: e.target.value })}>
                  <option value="">Any</option>
                  {PLAYBOOKS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
                </select>
              </Field>
            </div>
            {edit.channel === "email" && <Field label="Subject"><input className={inputCls} value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>}
            <Field label="Message">
              <textarea ref={bodyRef} rows={11} className={clsx(inputCls, "resize-y leading-relaxed")} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
            </Field>
            <div>
              <p className="mb-1.5 text-[12px] text-muted">Click to insert at the cursor:</p>
              <div className="flex flex-wrap gap-1.5">
                {vars.map((v) => <button key={v} type="button" onClick={() => insert(v)} className="rounded-pill border border-line bg-sunken px-2.5 py-1 font-mono text-[11px] hover:border-line-strong">{`{{${v}}}`}</button>)}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <button onClick={() => setEdit(null)} className={btn("ghost")}>Cancel</button>
              <button onClick={save} disabled={busy} className={btn("primary")}>{busy && <Spinner />}Save template</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
