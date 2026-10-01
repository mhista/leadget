"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { deleteProspects, deleteView, runAuditMany, saveView, setStageMany, tagMany } from "@/lib/actions";
import { STAGES, STAGE_META, type Prospect, type Stage } from "@/lib/types";
import { industryLabel, PLAYBOOK } from "@/lib/industries";
import { BUILTIN_VIEWS, EMPTY_FILTERS, activeCount, applyFilters, type ProspectFilters, type SavedView } from "@/lib/filters";
import { suggestAngles } from "@/lib/suggest";
import { PageHeader, ScoreRing, StagePill, btn, dueLabel, inputCls, money, selectCls, ago, Empty } from "@/components/ui";
import { Favicon } from "@/components/Favicon";
import { Check, Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { ProspectFormModal } from "@/components/ProspectForm";
import { ImportModal } from "@/components/ImportModal";
import { FilterRail, Chip, activeChips } from "@/components/FilterRail";
import { Modal } from "@/components/Modal";
import {
  IconGlobe, IconMail, IconPhone, IconPlus, IconSearch, IconTrash, IconUpload, IconUsers, IconZap, IconArrowRight, IconSparkle, IconX, IconStar,
} from "@/components/icons";

type Sort = "score" | "recent" | "name" | "value" | "follow" | "reviews";

export function ProspectTable({
  prospects, currency, views, initial,
}: {
  prospects: Prospect[];
  currency: string;
  views: SavedView[];
  initial: { stage?: string; industry?: string; sort?: string; view?: string; add: boolean };
}) {
  const router = useRouter();
  const toast = useToast();

  const start0 = (): ProspectFilters => {
    if (initial.view === "added") return { ...EMPTY_FILTERS, added: "today" };
    const v = [...BUILTIN_VIEWS, ...views].find((x) => x.id === initial.view);
    if (v) return { ...EMPTY_FILTERS, ...v.filters };
    return {
      ...EMPTY_FILTERS,
      stages: initial.stage && STAGES.includes(initial.stage as Stage) ? [initial.stage as Stage] : [],
      industries: initial.industry ? [initial.industry] : [],
    };
  };
  const [f, setF] = useState<ProspectFilters>(start0);
  const [viewId, setViewId] = useState<string | null>(initial.view ?? null);
  const [sort, setSort] = useState<Sort>((initial.sort as Sort) ?? "score");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(initial.add);
  const [importing, setImporting] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewName, setViewName] = useState("");
  const [tagging, setTagging] = useState(false);
  const [tag, setTag] = useState("");
  const [busy, start] = useTransition();

  const set = (next: ProspectFilters) => { setF(next); setViewId(null); };

  const rows = useMemo(() => {
    const r = applyFilters(prospects, f);
    const by: Record<Sort, (a: Prospect, b: Prospect) => number> = {
      score: (a, b) => b.score - a.score,
      recent: (a, b) => b.updated_at.localeCompare(a.updated_at),
      name: (a, b) => a.name.localeCompare(b.name),
      value: (a, b) => (b.deal_value ?? 0) - (a.deal_value ?? 0),
      follow: (a, b) => (a.next_follow_up ?? "9999").localeCompare(b.next_follow_up ?? "9999"),
      reviews: (a, b) => (b.reviews ?? 0) - (a.reviews ?? 0),
    };
    return r.sort(by[sort]);
  }, [prospects, f, sort]);

  const allViews = [...BUILTIN_VIEWS, ...views];
  const chips = activeChips(f, set);
  const nActive = activeCount(f);
  const selected = rows.filter((r) => picked.has(r.id));
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));

  // What to open with, across the selection — the most common first suggestion.
  const bulkAngle = useMemo(() => {
    if (!selected.length) return null;
    const tally = new Map<string, { n: number; label: string; reason: string; first: string }>();
    for (const p of selected) {
      const s = suggestAngles(p, 0, 1)[0];
      if (!s) continue;
      const t = tally.get(s.swipe.id) ?? { n: 0, label: s.swipe.angle, reason: s.reason, first: p.id };
      t.n++;
      tally.set(s.swipe.id, t);
    }
    const best = [...tally.entries()].sort((a, b) => b[1].n - a[1].n)[0];
    return best ? { id: best[0], ...best[1] } : null;
  }, [selected]);

  function toggle(id: string) {
    setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function bulk(kind: "audit" | "delete" | Stage) {
    const ids = selected.map((s) => s.id);
    if (!ids.length) return;
    if (kind === "delete" && !confirm(`Delete ${ids.length} prospect${ids.length === 1 ? "" : "s"} and their history? This can't be undone.\n\nThey'll stay out of your search results for a while (Settings → Removed businesses).`)) return;
    start(async () => {
      const res = kind === "audit" ? await runAuditMany(ids) : kind === "delete" ? await deleteProspects(ids) : await setStageMany(ids, kind);
      if (!res.ok) return toast(res.error, "error");
      toast(kind === "audit" ? `Audited ${ids.length} website${ids.length === 1 ? "" : "s"}.` : kind === "delete" ? "Deleted." : `Moved to ${STAGE_META[kind].label}.`);
      setPicked(new Set());
      router.refresh();
    });
  }

  function applyTag(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await tagMany(selected.map((s) => s.id), tag);
      if (!r.ok) return toast(r.error, "error");
      toast(`Tagged ${selected.length} with “${tag}”.`);
      setTag(""); setTagging(false);
      router.refresh();
    });
  }

  function doSaveView(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveView(viewName, f);
      if (!r.ok) return toast(r.error, "error");
      toast(`Saved view “${viewName}”.`);
      setViewId(r.data.id); setSaving(false); setViewName("");
      router.refresh();
    });
  }

  function exportCsv() {
    const cols: (keyof Prospect)[] = ["name", "industry", "stage", "score", "contact_name", "contact_role", "email", "phone", "website", "city", "country", "linkedin", "rating", "reviews", "deal_value", "next_follow_up", "tags", "notes"];
    const esc = (v: unknown) => { const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const list = selected.length ? selected : rows;
    const csv = [cols.join(","), ...list.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `leadget-prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const rail = <FilterRail prospects={prospects} f={f} set={set} />;

  return (
    <>
      <PageHeader
        eyebrow="Prospects"
        title="Everyone you could be working with"
        description="Filter like you would in Apollo, save the views you use every day, and pick up the angle Leadget suggests for each lead."
        action={
          <>
            <button onClick={exportCsv} className={btn("ghost", "md")} disabled={!rows.length}>Export{selected.length ? ` ${selected.length}` : ""}</button>
            <button onClick={() => setImporting(true)} className={btn("secondary", "md")}><IconUpload /> Import CSV</button>
            <button onClick={() => setAdding(true)} className={btn("primary", "md")}><IconPlus /> Add prospect</button>
          </>
        }
      />

      {prospects.length === 0 ? (
        <Empty
          icon={<IconUsers className="h-5 w-5" />}
          title="No prospects yet"
          body="Search a city for real estate agents, pharmacies, clinics or law firms — or add a business you already have in mind."
          action={<>
            <Link href="/find" className={btn("accent", "md")}><IconSearch /> Find leads</Link>
            <button onClick={() => setAdding(true)} className={btn("secondary", "md")}><IconPlus /> Add one by hand</button>
          </>}
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          {/* Filters (desktop) */}
          <aside className="card sticky top-6 hidden max-h-[calc(100svh-48px)] overflow-y-auto scroll-thin lg:block animate-rise">
            <ViewsList views={allViews} active={viewId} onPick={(v) => { setF({ ...EMPTY_FILTERS, ...v.filters }); setViewId(v.id); }}
              onDelete={(id) => start(async () => { await deleteView(id); if (viewId === id) setViewId(null); router.refresh(); })} />
            <div className="flex items-center justify-between border-y border-line px-4 py-2.5">
              <p className="mono">Filters{nActive ? ` · ${nActive}` : ""}</p>
              {nActive > 0 && <button onClick={() => setSaving(true)} className="text-[11.5px] font-medium text-brand hover:underline">Save as view</button>}
            </div>
            {rail}
          </aside>

          <div className="card min-w-0 overflow-hidden animate-rise [animation-delay:60ms]">
            {/* Search + sort */}
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <button onClick={() => setRailOpen(true)} className={btn(nActive ? "primary" : "secondary", "md", "lg:hidden")}>Filters{nActive ? ` · ${nActive}` : ""}</button>
              <div className="relative min-w-[200px] flex-1">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search name, city, email, phone, tag…" className={clsx(inputCls, "pl-9")} />
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={clsx(selectCls, "!w-auto min-w-[150px]")}>
                <option value="score">Best score</option>
                <option value="recent">Recently updated</option>
                <option value="follow">Follow-up date</option>
                <option value="reviews">Most reviews</option>
                <option value="value">Deal value</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {/* Active filters */}
            {(chips.length > 0 || viewId) && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-sunken px-4 py-2.5">
                {viewId && <span className="mr-1 text-[12px] font-medium">{allViews.find((v) => v.id === viewId)?.name}:</span>}
                {chips.map((c) => <Chip key={c.key} onRemove={c.clear}>{c.label}</Chip>)}
                <span className="ml-auto text-[12px] text-muted"><span className="num font-medium text-ink">{rows.length}</span> of {prospects.length}</span>
                {chips.length > 0 && <button onClick={() => set({ ...EMPTY_FILTERS, q: f.q })} className="text-[12px] text-muted hover:text-ink">Clear all</button>}
              </div>
            )}

            {/* Bulk bar */}
            {selected.length > 0 && (
              <div className="border-b border-line bg-accent/10 px-4 py-2.5 text-[12.5px] animate-rise">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{selected.length} selected</span>
                  <span className="mx-1 h-4 w-px bg-line-strong" />
                  <button onClick={() => bulk("audit")} disabled={busy} className={btn("secondary", "sm")}>{busy ? <Spinner className="h-3.5 w-3.5" /> : <IconGlobe className="h-3.5 w-3.5" />} Audit websites</button>
                  <select defaultValue="" onChange={(e) => { if (e.target.value) bulk(e.target.value as Stage); e.target.value = ""; }} className={clsx(selectCls, "h-8 !w-auto py-0 text-[12.5px]")} disabled={busy}>
                    <option value="">Move to stage…</option>
                    {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                  </select>
                  {tagging ? (
                    <form onSubmit={applyTag} className="flex items-center gap-1">
                      <input autoFocus value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag name" className={clsx(inputCls, "h-8 w-32 py-1 text-[12.5px]")} />
                      <button className={btn("primary", "sm")} disabled={!tag.trim() || busy}>Add</button>
                    </form>
                  ) : <button onClick={() => setTagging(true)} className={btn("secondary", "sm")}># Tag</button>}
                  <button onClick={() => bulk("delete")} disabled={busy} className={btn("danger", "sm")}><IconTrash className="h-3.5 w-3.5" /> Delete</button>
                  <button onClick={() => setPicked(new Set())} className="ml-auto text-muted hover:text-ink">Clear</button>
                </div>
                {bulkAngle && (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                    <IconSparkle className="h-3.5 w-3.5 text-brand" />
                    Suggested opener for {bulkAngle.n === selected.length ? "these" : `${bulkAngle.n} of these`}: <span className="font-medium text-ink">{bulkAngle.label}</span> — {bulkAngle.reason.toLowerCase()}.
                    <Link href={`/prospects/${bulkAngle.first}?angle=${bulkAngle.id}`} className="font-medium text-brand hover:underline">Start with the first →</Link>
                  </p>
                )}
              </div>
            )}

            {rows.length === 0 ? (
              <div className="px-5 py-14 text-center text-[13px] text-muted">
                Nothing matches those filters.
                <button onClick={() => set({ ...EMPTY_FILTERS })} className="ml-1 text-ink underline underline-offset-2">Clear them</button>
              </div>
            ) : (
              <div className="overflow-x-auto scroll-thin">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead>
                    <tr className="whitespace-nowrap border-b border-line text-[11.5px] text-muted">
                      <th className="w-10 py-2.5 pl-4"><Check checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
                      <th className="px-3 py-2.5 font-medium">Business</th>
                      <th className="px-3 py-2.5 font-medium">Stage</th>
                      <th className="px-3 py-2.5 font-medium">Website</th>
                      <th className="px-3 py-2.5 font-medium">Reach</th>
                      <th className="hidden px-3 py-2.5 font-medium 2xl:table-cell">Suggested angle</th>
                      <th className="px-3 py-2.5 font-medium">Follow-up</th>
                      <th className="px-3 py-2.5 text-right font-medium">Value</th>
                      <th className="py-2.5 pl-3 pr-5 text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 500).map((p) => {
                      const due = dueLabel(p.next_follow_up);
                      const issues = p.audit?.issues.length ?? 0;
                      const angle = suggestAngles(p, 0, 1)[0];
                      return (
                        <tr key={p.id} className={clsx("group border-b border-line/70 transition-colors hover:bg-sunken", picked.has(p.id) && "bg-accent/[.06]")}>
                          <td className="py-3 pl-4"><Check checked={picked.has(p.id)} onChange={() => toggle(p.id)} /></td>
                          <td className="max-w-[300px] px-3 py-3">
                            <Link href={`/prospects/${p.id}`} className="flex items-center gap-3">
                              <Favicon website={p.website} name={p.name} />
                              <span className="min-w-0">
                                <span className="block truncate font-medium group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">{p.name}</span>
                                <span className="block truncate text-[12px] text-muted">{PLAYBOOK[p.industry]?.emoji} {industryLabel(p.industry)}{p.city ? ` · ${p.city}` : ""}{p.country ? `, ${p.country}` : ""}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-3"><StagePill stage={p.stage} /></td>
                          <td className="px-3 py-3">
                            {!p.website ? (
                              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-warning"><IconZap className="h-3.5 w-3.5" />None</span>
                            ) : !p.audit ? (
                              <span className="text-[12px] text-faint">Not audited</span>
                            ) : !p.audit.reachable ? (
                              <span className="text-[12px] font-medium text-danger">Down</span>
                            ) : (
                              <span className={clsx("text-[12px]", issues >= 4 ? "font-medium text-danger" : issues ? "text-warning" : "text-success")}>
                                {issues ? `${issues} issue${issues === 1 ? "" : "s"}` : "Looks fine"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="flex items-center gap-1.5 text-faint">
                              <IconMail className={clsx("h-3.5 w-3.5", p.email && "text-ink")} />
                              <IconPhone className={clsx("h-3.5 w-3.5", p.phone && "text-ink")} />
                              {p.reviews ? <span className="inline-flex items-center gap-0.5 text-[11.5px] text-muted"><IconStar className="h-3 w-3" />{p.reviews}</span> : null}
                              {p.contact_name && <span className="truncate text-[12px] text-muted">{p.contact_name}</span>}
                            </span>
                          </td>
                          <td className="hidden max-w-[200px] px-3 py-3 2xl:table-cell">
                            {angle && (
                              <Link href={`/prospects/${p.id}?angle=${angle.swipe.id}`} title={angle.reason} className="inline-flex max-w-full items-center gap-1 truncate text-[12px] text-muted hover:text-brand">
                                <IconSparkle className="h-3 w-3 shrink-0" /><span className="truncate">{angle.swipe.angle}</span>
                              </Link>
                            )}
                          </td>
                          <td className="px-3 py-3 text-[12px]">
                            {due ? <span className={clsx(due.tone === "danger" ? "font-medium text-danger" : due.tone === "warning" ? "font-medium text-warning" : "text-muted")}>{due.text}</span>
                              : p.last_contacted_at ? <span className="text-faint">Touched {ago(p.last_contacted_at)}</span> : <span className="text-faint">—</span>}
                          </td>
                          <td className="num px-3 py-3 text-right text-muted">{money(p.deal_value, currency)}</td>
                          <td className="py-3 pl-3 pr-5 text-right">
                            <Link href={`/prospects/${p.id}`} className="inline-flex items-center gap-2">
                              <ScoreRing score={p.score} />
                              <IconArrowRight className="h-4 w-4 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length > 500 && <p className="px-5 py-3 text-[12px] text-muted">Showing the first 500 of {rows.length}. Narrow the filters to see the rest.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters (mobile drawer) */}
      {railOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRailOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[min(340px,92vw)] overflow-y-auto bg-surface shadow-lift animate-rise scroll-thin">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
              <p className="font-medium">Filters{nActive ? ` · ${nActive}` : ""}</p>
              <button onClick={() => setRailOpen(false)} className={btn("primary", "sm")}>Show {rows.length}</button>
            </div>
            <ViewsList views={allViews} active={viewId} onPick={(v) => { setF({ ...EMPTY_FILTERS, ...v.filters }); setViewId(v.id); }} onDelete={(id) => start(async () => { await deleteView(id); router.refresh(); })} />
            {rail}
          </div>
        </div>
      )}

      <Modal open={saving} onClose={() => setSaving(false)} title="Save this view" description="Saved views sit at the top of the filter panel, one click away.">
        <form onSubmit={doSaveView} className="space-y-4">
          <input autoFocus className={inputCls} value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="e.g. Dubai real estate, no website" />
          <div className="flex flex-wrap gap-1.5">{chips.map((c) => <span key={c.key} className="rounded-pill bg-page-alt px-2.5 py-1 text-[11.5px] text-muted">{c.label}</span>)}</div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" onClick={() => setSaving(false)} className={btn("ghost")}>Cancel</button>
            <button className={btn("primary")} disabled={!viewName.trim() || busy}>{busy && <Spinner />}Save view</button>
          </div>
        </form>
      </Modal>

      <ProspectFormModal open={adding} onClose={() => setAdding(false)} />
      <ImportModal open={importing} onClose={() => setImporting(false)} />
    </>
  );
}

function ViewsList({ views, active, onPick, onDelete }: { views: SavedView[]; active: string | null; onPick: (v: SavedView) => void; onDelete: (id: string) => void }) {
  const mine = views.filter((v) => !v.builtin);
  const built = views.filter((v) => v.builtin);
  const row = (v: SavedView) => (
    <li key={v.id} className="group flex items-center">
      <button onClick={() => onPick(v)} className={clsx("flex-1 truncate rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors", active === v.id ? "bg-ink text-page" : "hover:bg-page-alt")}>{v.name}</button>
      {!v.builtin && <button onClick={() => onDelete(v.id)} className="ml-1 hidden h-6 w-6 place-items-center rounded text-faint hover:text-danger group-hover:grid" aria-label={`Delete ${v.name}`}><IconX className="h-3 w-3" /></button>}
    </li>
  );
  return (
    <div className="px-2 py-3">
      {mine.length > 0 && (
        <>
          <p className="mono px-2 pb-1">My views</p>
          <ul className="mb-2">{mine.map(row)}</ul>
        </>
      )}
      <p className="mono px-2 pb-1">Quick views</p>
      <ul>{built.map(row)}</ul>
    </div>
  );
}
