"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { addNote, logOutreach } from "@/lib/actions";
import type { Activity, ActivityType, Prospect } from "@/lib/types";
import { btn, inputCls, ago } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconEye, IconArrowRight, IconChat, IconGlobe, IconLinkedin, IconMail, IconNote, IconPhone, IconSparkle } from "@/components/icons";

const ICON: Record<ActivityType, React.ReactNode> = {
  email: <IconMail className="h-3.5 w-3.5" />, whatsapp: <IconChat className="h-3.5 w-3.5" />, call: <IconPhone className="h-3.5 w-3.5" />,
  linkedin: <IconLinkedin className="h-3.5 w-3.5" />, note: <IconNote className="h-3.5 w-3.5" />, audit: <IconGlobe className="h-3.5 w-3.5" />,
  stage: <IconArrowRight className="h-3.5 w-3.5" />, created: <IconSparkle className="h-3.5 w-3.5" />,
  viewed: <IconEye className="h-3.5 w-3.5" />,
};
const LABEL: Record<ActivityType, string> = {
  email: "Email sent", whatsapp: "WhatsApp sent", call: "Call", linkedin: "LinkedIn message", note: "Note", audit: "Audit", stage: "Stage", created: "Added", viewed: "They opened it",
};

export function Timeline({ p, activities }: { p: Prospect; activities: Activity[] }) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<"note" | "call">("note");
  const [text, setText] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [saving, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = kind === "note" ? await addNote(p.id, text) : await logOutreach(p.id, "call", text || "Called", 3);
      if (!r.ok) return toast(r.error, "error");
      setText("");
      toast(kind === "note" ? "Note added." : "Call logged, follow-up in 3 days.");
      router.refresh();
    });
  }

  return (
    <section className="card overflow-hidden animate-rise [animation-delay:180ms]">
      <div className="border-b border-line px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold">History</h2>
      </div>
      <form onSubmit={save} className="border-b border-line p-4">
        <div className="mb-2 flex gap-1 text-[12px]">
          {(["note", "call"] as const).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={clsx("rounded-pill px-3 py-1 transition-colors", kind === k ? "bg-ink text-page" : "text-muted hover:bg-page-alt")}>
              {k === "note" ? "Add note" : "Log a call"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder={kind === "note" ? "What did you learn?" : "How did the call go?"} />
          <button className={btn("primary", "md")} disabled={saving || (kind === "note" && !text.trim())}>{saving ? <Spinner /> : "Save"}</button>
        </div>
      </form>
      {activities.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted">Nothing yet.</p>
      ) : (
        <ol className="relative px-5 py-4">
          <span aria-hidden className="absolute bottom-6 left-[34px] top-6 w-px bg-line" />
          {(all ? activities : activities.slice(0, 8)).map((a) => {
            const long = a.body.length > 140 || a.body.includes("\n");
            return (
              <li key={a.id} className="relative flex gap-3 py-2">
                <span className={clsx("relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-surface",
                  ["email", "whatsapp", "call", "linkedin"].includes(a.type) ? "bg-brand text-brand-ink" : a.type === "viewed" ? "bg-accent text-accent-ink" : "bg-page-alt text-muted")}>
                  {ICON[a.type]}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[12.5px]"><span className="font-medium">{LABEL[a.type]}</span> <span className="text-faint">· {ago(a.created_at)}</span></p>
                  <p className={clsx("mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted", long && open !== a.id && "line-clamp-2")}>{a.body}</p>
                  {long && <button onClick={() => setOpen(open === a.id ? null : a.id)} className="mt-0.5 text-[11.5px] text-muted underline underline-offset-2 hover:text-ink">{open === a.id ? "Less" : "Show all"}</button>}
                </div>
              </li>
            );
          })}
          {activities.length > 8 && (
            <li className="relative pl-10 pt-2">
              <button onClick={() => setAll(!all)} className="text-[12px] text-muted underline underline-offset-2 hover:text-ink">
                {all ? "Show less" : `Show ${activities.length - 8} older`}
              </button>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}
