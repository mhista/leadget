"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { clearFollowUp, deleteAndGoBack, setStage, snooze, updateProspect } from "@/lib/actions";
import { STAGES, STAGE_META, type Activity, type Invoice, type Prospect, type Settings, type Template } from "@/lib/types";
import { industryLabel, playbook } from "@/lib/industries";
import { emailHunt, linkedinSearch, whatsappLink } from "@/lib/links";
import { Card, ScoreRing, btn, dueLabel, inputCls, money, ScoreBadge } from "@/components/ui";
import { Favicon } from "@/components/Favicon";
import { useToast } from "@/components/Toast";
import { ProspectFormModal } from "@/components/ProspectForm";
import { AuditPanel } from "@/components/AuditPanel";
import { PitchComposer } from "@/components/PitchComposer";
import { Timeline } from "@/components/Timeline";
import { SharePanel } from "@/components/SharePanel";
import { NewInvoiceButton, StatusTag } from "@/components/kymaa/InvoiceList";
import { money as invMoney, totals } from "@/lib/kymaa/invoice";
import {
  IconArrowLeft, IconCalendar, IconChat, IconEdit, IconExternal, IconGlobe, IconLinkedin, IconMail, IconPhone, IconPin, IconSearch, IconStar, IconTrash, IconChevronDown,
} from "@/components/icons";

export function ProspectView({
  p, activities, invoices = [], settings, templates, ai, reasons, touches, initialAngle,
}: {
  p: Prospect; activities: Activity[]; invoices?: Invoice[]; settings: Settings; templates: Template[]; ai: boolean;
  reasons: { label: string; points: number }[]; touches: number; initialAngle?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [pending, start] = useTransition();
  const pb = playbook(p.industry);
  const due = dueLabel(p.next_follow_up);

  function changeStage(s: typeof STAGES[number]) {
    setStageOpen(false);
    start(async () => {
      const r = await setStage(p.id, s);
      if (!r.ok) return toast(r.error, "error");
      toast(`Moved to ${STAGE_META[s].label}.`);
      router.refresh();
    });
  }

  function patch(x: Partial<Prospect>, msg = "Saved.") {
    start(async () => {
      const r = await updateProspect(p.id, x);
      if (!r.ok) return toast(r.error, "error");
      toast(msg);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-rise">
        <Link href="/prospects" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"><IconArrowLeft className="h-3.5 w-3.5" /> Prospects</Link>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <Favicon website={p.website} name={p.name} size={56} />
            <div className="min-w-0">
              <h1 className="display text-[clamp(1.7rem,1.3rem+1.5vw,2.5rem)]">{p.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                <span>{pb.emoji} {industryLabel(p.industry)}</span>
                {(p.city || p.country) && <span className="inline-flex items-center gap-1"><IconPin className="h-3.5 w-3.5" />{[p.city, p.country].filter(Boolean).join(", ")}</span>}
                {p.rating != null && <span className="inline-flex items-center gap-1"><IconStar className="h-3.5 w-3.5 fill-warning text-warning" />{p.rating.toFixed(1)} · {p.reviews ?? 0} reviews</span>}
                {p.website
                  ? <a href={p.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink"><IconGlobe className="h-3.5 w-3.5" />{p.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}<IconExternal className="h-3 w-3" /></a>
                  : <span className="font-medium text-warning">No website</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setStageOpen(!stageOpen)} disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong bg-surface pl-3 pr-3.5 text-[13px] font-medium transition-colors hover:border-ink/40">
                <span className="h-2 w-2 rounded-full" style={{ background: STAGE_META[p.stage].hue }} />
                {STAGE_META[p.stage].label}
                <IconChevronDown className="h-3.5 w-3.5 text-muted" />
              </button>
              {stageOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setStageOpen(false)} />
                  <div className="absolute right-0 z-30 mt-2 w-60 animate-rise overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-pop">
                    {STAGES.map((s) => (
                      <button key={s} onClick={() => changeStage(s)} className={clsx("flex w-full items-start gap-2.5 px-3.5 py-2 text-left hover:bg-page-alt", s === p.stage && "bg-page-alt")}>
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: STAGE_META[s].hue }} />
                        <span><span className="block text-[13px] font-medium">{STAGE_META[s].label}</span><span className="block text-[11.5px] text-muted">{STAGE_META[s].hint}</span></span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setEditing(true)} className={btn("secondary", "icon")} aria-label="Edit"><IconEdit /></button>
            <button
              onClick={() => { if (confirm(`Delete ${p.name} and its history?\n\nIt'll stay out of your search results for a while (Settings → Removed businesses).`)) start(() => deleteAndGoBack(p.id)); }}
              className={btn("ghost", "icon", "hover:!text-danger")} aria-label="Delete"><IconTrash /></button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <SharePanel p={p} settings={settings} />
          <PitchComposer p={p} settings={settings} templates={templates} ai={ai} touches={touches} initialAngle={initialAngle} />
          <AuditPanel p={p} />
          <Timeline p={p} activities={activities} />
        </div>

        <aside className="space-y-4">
          {/* Contact */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[13.5px] font-semibold">Contact</h2>
              <button onClick={() => setEditing(true)} className="text-[12px] text-muted hover:text-ink">Edit</button>
            </div>
            {p.contact_name ? (
              <div className="mb-4">
                <p className="text-[14px] font-medium">{p.contact_name}</p>
                {p.contact_role && <p className="text-[12.5px] text-muted">{p.contact_role}</p>}
              </div>
            ) : (
              <a href={linkedinSearch(p.name)} target="_blank" rel="noreferrer" className="mb-4 flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-2.5 text-[12.5px] text-muted hover:border-ink/40 hover:text-ink">
                <IconSearch className="h-4 w-4" /> Find the decision-maker on LinkedIn
              </a>
            )}
            <ul className="space-y-1 text-[13px]">
              <ContactRow icon={<IconMail />} value={p.email} href={p.email ? `mailto:${p.email}` : undefined}
                empty={<a href={emailHunt(p.website, p.name)} target="_blank" rel="noreferrer" className="text-muted underline decoration-line-strong underline-offset-2 hover:text-ink">Hunt for an email</a>} />
              <ContactRow icon={<IconPhone />} value={p.phone} href={p.phone ? `tel:${p.phone}` : undefined} />
              {p.phone && <ContactRow icon={<IconChat />} value="WhatsApp" href={whatsappLink(p.phone, p.country, "")} external />}
              <ContactRow icon={<IconLinkedin />} value={p.linkedin ? "LinkedIn profile" : ""} href={p.linkedin || undefined} external />
            </ul>
          </Card>

          {/* Follow-up */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13.5px] font-semibold">Next follow-up</h2>
              {due && <span className={clsx("text-[12px] font-medium", due.tone === "danger" ? "text-danger" : due.tone === "warning" ? "text-warning" : "text-muted")}>{due.text}</span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <IconCalendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input type="date" className={clsx(inputCls, "pl-9")} value={p.next_follow_up ?? ""}
                  onChange={(e) => patch({ next_follow_up: e.target.value || null }, "Follow-up set.")} />
              </div>
              {p.next_follow_up && <button onClick={() => start(async () => { await clearFollowUp(p.id); router.refresh(); })} className={btn("ghost", "sm")}>Clear</button>}
            </div>
            <div className="mt-2.5 flex gap-1.5">
              {[1, 3, 7, 14].map((d) => (
                <button key={d} onClick={() => start(async () => { await snooze(p.id, d); toast(`Follow up in ${d} day${d === 1 ? "" : "s"}.`); router.refresh(); })}
                  className="flex-1 rounded-md border border-line py-1.5 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink">+{d}d</button>
              ))}
            </div>
          </Card>

          {/* Score */}
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={p.score} size={56} />
              <div>
                <h2 className="text-[13.5px] font-semibold">Lead score <ScoreBadge score={p.score} /></h2>
                <p className="text-[12px] text-muted">What&apos;s to fix, can you reach them, can they pay</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 text-[12.5px]">
              {reasons.map((r) => (
                <li key={r.label} className="flex justify-between gap-3"><span className="text-muted">{r.label}</span><span className="num font-medium">+{r.points}</span></li>
              ))}
            </ul>
          </Card>

          {/* Deal */}
          <Card className="p-5">
            <h2 className="mb-3 text-[13.5px] font-semibold">Deal value</h2>
            <DealInput value={p.deal_value} currency={settings.currency} onSave={(v) => patch({ deal_value: v }, "Deal value saved.")} />
          </Card>

          {/* Invoices */}
          {(invoices.length > 0 || ["proposal", "won"].includes(p.stage)) && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13.5px] font-semibold">Invoices</h2>
                {invoices.length > 0 && <Link href="/invoices" className="text-[12px] text-muted hover:text-ink">All</Link>}
              </div>
              {invoices.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {invoices.map((i) => {
                    const t = totals(i.doc);
                    return (
                      <li key={i.id}>
                        <Link href={`/invoices/${i.id}`} className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-page-alt">
                          <span><span className="block font-mono text-[11.5px] font-medium">{i.doc.number}</span><span className="num text-[12px] text-muted">{invMoney(i.doc, t.balance)} due</span></span>
                          <StatusTag status={t.status} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!invoices.length && <p className="mb-3 text-[12.5px] text-muted">They&apos;re close. Have the invoice ready — name, contact and deal value come across.</p>}
              <NewInvoiceButton prospectId={p.id} size="sm" label={invoices.length ? "Another invoice" : "Create invoice"} />
            </Card>
          )}

          {/* Playbook */}
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-sunken px-5 py-3.5">
              <p className="mono">Playbook</p>
              <h2 className="mt-1 text-[13.5px] font-semibold">Talking to {pb.label.toLowerCase()} owners</h2>
            </div>
            <div className="space-y-4 p-5 text-[12.5px] leading-relaxed">
              <div>
                <p className="mb-1.5 font-medium">What usually hurts</p>
                <ul className="space-y-1 text-muted">{pb.pains.map((x) => <li key={x} className="flex gap-2"><span className="text-faint">–</span>{x}</li>)}</ul>
              </div>
              <div>
                <p className="mb-1.5 font-medium">What you can offer</p>
                <ul className="space-y-1 text-muted">{pb.offers.map((x) => <li key={x} className="flex gap-2"><span className="text-brand">+</span>{x}</li>)}</ul>
              </div>
              <p className="rounded-md bg-accent/15 px-3 py-2 text-ink">“{pb.hook}”</p>
            </div>
          </Card>

          {p.notes && (
            <Card className="p-5">
              <h2 className="mb-2 text-[13.5px] font-semibold">Notes</h2>
              <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted">{p.notes}</p>
            </Card>
          )}
        </aside>
      </div>

      <ProspectFormModal key={p.updated_at} open={editing} onClose={() => setEditing(false)} prospect={p} />
    </div>
  );
}

function ContactRow({ icon, value, href, external, empty }: { icon: React.ReactNode; value: string; href?: string; external?: boolean; empty?: React.ReactNode }) {
  const inner = (
    <>
      <span className="text-faint [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{value || empty || <span className="text-faint">—</span>}</span>
      {external && value && <IconExternal className="h-3.5 w-3.5 text-faint" />}
    </>
  );
  return (
    <li>
      {href && value
        ? <a href={href} target={external ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-page-alt">{inner}</a>
        : <div className="flex items-center gap-3 px-0 py-1.5">{inner}</div>}
    </li>
  );
}

function DealInput({ value, currency, onSave }: { value: number | null; currency: string; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  const dirty = v !== (value == null ? "" : String(value));
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-faint">{currency}</span>
        <input type="number" min={0} className={clsx(inputCls, "pl-12 num")} value={v} onChange={(e) => setV(e.target.value)} />
      </div>
      {dirty ? <button onClick={() => onSave(v === "" ? null : Number(v))} className={btn("primary", "sm")}>Save</button>
        : <span className="text-[12px] text-muted">{money(value, currency)}</span>}
    </div>
  );
}
