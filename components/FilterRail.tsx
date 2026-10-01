"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { STAGES, STAGE_META, SIZES, type Prospect } from "@/lib/types";
import { industryLabel, PLAYBOOK } from "@/lib/industries";
import { findCountry } from "@/lib/geo/countries";
import {
  ACTIVITY_LABEL, ADDED_LABEL, CONTACT_LABEL, EMPTY_FILTERS, WEBSITE_LABEL, applyFilters,
  type ActivityFilter, type AddedFilter, type ContactFilter, type ProspectFilters, type WebsiteFilter,
} from "@/lib/filters";
import { inputCls, selectCls } from "@/components/ui";
import { Check } from "@/components/controls";
import { IconChevronDown, IconX } from "@/components/icons";

/**
 * The left-hand filter panel. Each section shows how many prospects each
 * option would match, so you never filter your way into an empty list blind.
 */
export function FilterRail({
  prospects, f, set,
}: { prospects: Prospect[]; f: ProspectFilters; set: (f: ProspectFilters) => void }) {
  const up = <K extends keyof ProspectFilters>(k: K, v: ProspectFilters[K]) => set({ ...f, [k]: v });
  const toggle = <K extends "stages" | "industries" | "countries" | "sizes" | "sources" | "website" | "contact" | "tags">(k: K, v: ProspectFilters[K][number]) => {
    const arr = f[k] as string[];
    up(k, (arr.includes(v as string) ? arr.filter((x) => x !== v) : [...arr, v]) as ProspectFilters[K]);
  };

  // Count against everything *except* this section's own filter.
  const countWith = (patch: Partial<ProspectFilters>) => applyFilters(prospects, { ...f, ...patch }).length;

  const industries = useMemo(() => [...new Set(prospects.map((p) => p.industry))].sort(), [prospects]);
  const countries = useMemo(() => [...new Set(prospects.map((p) => p.country).filter(Boolean))].sort(), [prospects]);
  const tags = useMemo(() => [...new Set(prospects.flatMap((p) => p.tags))].sort(), [prospects]);
  const sources = useMemo(() => [...new Set(prospects.map((p) => p.source))], [prospects]);
  const [city, setCity] = useState("");

  return (
    <div className="divide-y divide-line text-[12.5px]">
      <Section title="Stage" active={f.stages.length > 0} onClear={() => up("stages", [])} open>
        {STAGES.map((s) => (
          <Opt key={s} checked={f.stages.includes(s)} onChange={() => toggle("stages", s)} n={countWith({ stages: [s] })}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_META[s].hue }} />{STAGE_META[s].label}
          </Opt>
        ))}
      </Section>

      <Section title="Website" active={f.website.length > 0} onClear={() => up("website", [])} open>
        {(Object.keys(WEBSITE_LABEL) as WebsiteFilter[]).map((w) => (
          <Opt key={w} checked={f.website.includes(w)} onChange={() => toggle("website", w)} n={countWith({ website: [w] })}>{WEBSITE_LABEL[w]}</Opt>
        ))}
      </Section>

      <Section title="Industry" active={f.industries.length > 0} onClear={() => up("industries", [])} open={industries.length > 1}>
        {industries.map((i) => (
          <Opt key={i} checked={f.industries.includes(i)} onChange={() => toggle("industries", i)} n={countWith({ industries: [i] })}>
            <span>{PLAYBOOK[i]?.emoji ?? "🏢"}</span>{industryLabel(i)}
          </Opt>
        ))}
      </Section>

      <Section title="Location" active={f.countries.length > 0 || f.cities.length > 0} onClear={() => set({ ...f, countries: [], cities: [] })}>
        {countries.map((c) => (
          <Opt key={c} checked={f.countries.includes(c)} onChange={() => toggle("countries", c)} n={countWith({ countries: [c] })}>
            <span>{findCountry(c)?.flag ?? "🌍"}</span>{c}
          </Opt>
        ))}
        <form className="mt-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (city.trim() && !f.cities.includes(city.trim())) up("cities", [...f.cities, city.trim()]); setCity(""); }}>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={clsx(inputCls, "h-8 py-1 text-[12.5px]")} placeholder="City contains… (Enter)" />
        </form>
        {f.cities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {f.cities.map((c) => <Chip key={c} onRemove={() => up("cities", f.cities.filter((x) => x !== c))}>{c}</Chip>)}
          </div>
        )}
      </Section>

      <Section title="Contact info" active={f.contact.length > 0} onClear={() => up("contact", [])}>
        {(Object.keys(CONTACT_LABEL) as ContactFilter[]).map((c) => (
          <Opt key={c} checked={f.contact.includes(c)} onChange={() => toggle("contact", c)} n={countWith({ contact: [...f.contact.filter((x) => x !== c), c] })}>{CONTACT_LABEL[c]}</Opt>
        ))}
      </Section>

      <Section title="Activity" active={f.activity !== "any"} onClear={() => up("activity", "any")}>
        {(Object.keys(ACTIVITY_LABEL) as ActivityFilter[]).map((a) => (
          <Radio key={a} checked={f.activity === a} onChange={() => up("activity", a)} n={a === "any" ? undefined : countWith({ activity: a })}>{ACTIVITY_LABEL[a]}</Radio>
        ))}
      </Section>

      <Section title="Lead score" active={f.scoreMin > 0} onClear={() => up("scoreMin", 0)}>
        <div className="flex items-center gap-3 px-1">
          <input type="range" min={0} max={90} step={5} value={f.scoreMin} onChange={(e) => up("scoreMin", Number(e.target.value))} className="flex-1 accent-[rgb(var(--brand))]" />
          <span className="num w-12 text-right font-medium">{f.scoreMin ? `${f.scoreMin}+` : "Any"}</span>
        </div>
        <div className="mt-2 flex gap-1">
          {[["Warm", 40], ["Hot", 65]].map(([l, v]) => (
            <button key={l} type="button" onClick={() => up("scoreMin", v as number)} className={clsx("flex-1 rounded-md border py-1 text-[11.5px]", f.scoreMin === v ? "border-ink bg-ink text-page" : "border-line hover:border-line-strong")}>{l}+</button>
          ))}
        </div>
      </Section>

      <Section title="Company" active={f.sizes.length > 0 || f.ratingMin > 0 || f.reviewsMin > 0 || f.dealMin > 0}
        onClear={() => set({ ...f, sizes: [], ratingMin: 0, reviewsMin: 0, dealMin: 0 })}>
        {SIZES.map((s) => (
          <Opt key={s.id} checked={f.sizes.includes(s.id)} onChange={() => toggle("sizes", s.id)} n={countWith({ sizes: [s.id] })}>{s.label}</Opt>
        ))}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label><span className="mb-1 block text-[11px] text-muted">Min. rating</span>
            <select className={clsx(selectCls, "h-8 py-0 text-[12.5px]")} value={f.ratingMin} onChange={(e) => up("ratingMin", Number(e.target.value))}>
              {[0, 3, 3.5, 4, 4.5].map((n) => <option key={n} value={n}>{n ? `${n}★+` : "Any"}</option>)}
            </select>
          </label>
          <label><span className="mb-1 block text-[11px] text-muted">Min. reviews</span>
            <select className={clsx(selectCls, "h-8 py-0 text-[12.5px]")} value={f.reviewsMin} onChange={(e) => up("reviewsMin", Number(e.target.value))}>
              {[0, 10, 50, 100, 250].map((n) => <option key={n} value={n}>{n ? `${n}+` : "Any"}</option>)}
            </select>
          </label>
          <label className="col-span-2"><span className="mb-1 block text-[11px] text-muted">Min. deal value</span>
            <input type="number" min={0} step={500} className={clsx(inputCls, "h-8 py-1 text-[12.5px]")} value={f.dealMin || ""} onChange={(e) => up("dealMin", Number(e.target.value) || 0)} placeholder="Any" />
          </label>
        </div>
      </Section>

      {tags.length > 0 && (
        <Section title="Tags" active={f.tags.length > 0} onClear={() => up("tags", [])}>
          {tags.slice(0, 30).map((t) => (
            <Opt key={t} checked={f.tags.includes(t)} onChange={() => toggle("tags", t)} n={countWith({ tags: [t] })}>{t}</Opt>
          ))}
        </Section>
      )}

      <Section title="Source & date added" active={f.sources.length > 0 || f.added !== "any"} onClear={() => set({ ...f, sources: [], added: "any" })}>
        {sources.map((s) => (
          <Opt key={s} checked={f.sources.includes(s)} onChange={() => toggle("sources", s)} n={countWith({ sources: [s] })}>
            {{ google: "Google Maps", osm: "OpenStreetMap", csv: "CSV import", manual: "Added by hand" }[s]}
          </Opt>
        ))}
        <select className={clsx(selectCls, "mt-2 h-8 py-0 text-[12.5px]")} value={f.added} onChange={(e) => up("added", e.target.value as AddedFilter)}>
          {(Object.keys(ADDED_LABEL) as AddedFilter[]).map((a) => <option key={a} value={a}>Added: {ADDED_LABEL[a]}</option>)}
        </select>
      </Section>

      <div className="px-4 py-3">
        <button onClick={() => set({ ...EMPTY_FILTERS, q: f.q })} className="text-[12px] text-muted underline underline-offset-2 hover:text-ink">Reset all filters</button>
      </div>
    </div>
  );
}

function Section({ title, active, onClear, open: initial = false, children }: { title: string; active: boolean; onClear: () => void; open?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initial || active);
  return (
    <section>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button type="button" onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 text-left font-medium">
          <IconChevronDown className={clsx("h-3.5 w-3.5 text-faint transition-transform", !open && "-rotate-90")} />
          {title}
          {active && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
        </button>
        {active && <button type="button" onClick={onClear} className="text-[11px] text-muted hover:text-ink">Clear</button>}
      </div>
      {open && <div className="space-y-0.5 px-4 pb-3">{children}</div>}
    </section>
  );
}

function Opt({ checked, onChange, n, children }: { checked: boolean; onChange: () => void; n?: number; children: React.ReactNode }) {
  return (
    <label className={clsx("flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-page-alt", n === 0 && !checked && "opacity-45")}>
      <Check checked={checked} onChange={onChange} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">{children}</span>
      {n !== undefined && <span className="num text-[11px] text-faint">{n}</span>}
    </label>
  );
}

function Radio({ checked, onChange, n, children }: { checked: boolean; onChange: () => void; n?: number; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-page-alt">
      <input type="radio" checked={checked} onChange={onChange} className="accent-[rgb(var(--ink))]" />
      <span className="flex-1 truncate">{children}</span>
      {n !== undefined && <span className="num text-[11px] text-faint">{n}</span>}
    </label>
  );
}

export function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-line bg-surface py-0.5 pl-2.5 pr-1 text-[12px]">
      {children}
      <button type="button" onClick={onRemove} className="grid h-4 w-4 place-items-center rounded-full text-muted hover:bg-page-alt hover:text-ink" aria-label="Remove"><IconX className="h-2.5 w-2.5" /></button>
    </span>
  );
}

/** One chip per active filter, for the strip above the table. */
export function activeChips(f: ProspectFilters, set: (f: ProspectFilters) => void) {
  const out: { key: string; label: string; clear: () => void }[] = [];
  const list = <K extends "stages" | "industries" | "countries" | "cities" | "sizes" | "sources" | "website" | "contact" | "tags">(k: K, label: (v: string) => string) => {
    for (const v of f[k] as string[]) out.push({ key: `${k}-${v}`, label: label(v), clear: () => set({ ...f, [k]: (f[k] as string[]).filter((x) => x !== v) }) });
  };
  list("stages", (v) => STAGE_META[v as keyof typeof STAGE_META].label);
  list("website", (v) => WEBSITE_LABEL[v as WebsiteFilter]);
  list("industries", industryLabel);
  list("countries", (v) => `${findCountry(v)?.flag ?? ""} ${v}`);
  list("cities", (v) => `City: ${v}`);
  list("contact", (v) => CONTACT_LABEL[v as ContactFilter]);
  list("sizes", (v) => SIZES.find((s) => s.id === v)?.label ?? v);
  list("sources", (v) => `Source: ${v}`);
  list("tags", (v) => `#${v}`);
  if (f.activity !== "any") out.push({ key: "activity", label: ACTIVITY_LABEL[f.activity], clear: () => set({ ...f, activity: "any" }) });
  if (f.added !== "any") out.push({ key: "added", label: `Added ${ADDED_LABEL[f.added].toLowerCase()}`, clear: () => set({ ...f, added: "any" }) });
  if (f.scoreMin) out.push({ key: "score", label: `Score ${f.scoreMin}+`, clear: () => set({ ...f, scoreMin: 0 }) });
  if (f.ratingMin) out.push({ key: "rating", label: `${f.ratingMin}★+`, clear: () => set({ ...f, ratingMin: 0 }) });
  if (f.reviewsMin) out.push({ key: "reviews", label: `${f.reviewsMin}+ reviews`, clear: () => set({ ...f, reviewsMin: 0 }) });
  if (f.dealMin) out.push({ key: "deal", label: `Deal ${f.dealMin.toLocaleString()}+`, clear: () => set({ ...f, dealMin: 0 }) });
  return out;
}
