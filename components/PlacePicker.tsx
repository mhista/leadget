"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { COUNTRIES, POPULAR, findCountry, type Country } from "@/lib/geo/countries";
import { IconCheck, IconChevronDown, IconPin, IconPlus, IconSearch, IconX } from "@/components/icons";

/**
 * Country and city pickers.
 *
 * Both are searchable popovers that open downward, or upward when there isn't
 * room below (a "drop-up"). Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
 * The city list comes from /api/geo/cities as you type, and anything not in
 * the list (a neighbourhood like "Victoria Island") can still be used as typed.
 */

type City = { name: string; population: number; admin?: string };

/* ── Shared popover ──────────────────────────────────────────────────── */

function usePopover() {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    // Room is limited by the window *and* any scrolling box we're inside (a modal, say).
    let top = 0, bottom = window.innerHeight;
    for (let el = anchor.current.parentElement; el; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === "auto" || oy === "scroll" || oy === "hidden") {
        const b = el.getBoundingClientRect();
        top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom);
        break;
      }
    }
    const below = bottom - r.bottom;
    const above = r.top - top;
    setUp(below < 340 && above > below);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (anchor.current && !anchor.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return { open, setOpen, up, anchor };
}

const panelCls = (up: boolean) =>
  clsx("absolute left-0 right-0 z-50 overflow-hidden rounded-lg border border-line bg-surface shadow-pop animate-rise min-w-[260px]",
    up ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]");

const fieldCls =
  "flex min-h-[38px] w-full items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-left text-[13.5px] text-ink outline-none transition-colors duration-200 hover:border-line-strong focus-within:border-ink/50 focus-within:ring-4 focus-within:ring-ink/5";

export const fmtPop = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

function useListNav<T>(items: T[], onPick: (t: T) => void, open: boolean) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [items.length, open]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (items[active]) onPick(items[active]); }
  };
  return { active, setActive, onKeyDown };
}

/* ── Country ─────────────────────────────────────────────────────────── */

export function CountrySelect({
  value, onChange, placeholder = "Choose a country", allowClear = true, className,
}: {
  value: string;
  onChange: (country: Country | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}) {
  const { open, setOpen, up, anchor } = usePopover();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const current = findCountry(value);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) {
      const pop = POPULAR.map((c) => COUNTRIES.find((x) => x.code === c)!).filter(Boolean);
      return [...pop, ...COUNTRIES.filter((c) => !POPULAR.includes(c.code))];
    }
    const alias = findCountry(s);
    const hits = COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s);
    hits.sort((a, b) => Number(b.name.toLowerCase().startsWith(s)) - Number(a.name.toLowerCase().startsWith(s)));
    return alias && !hits.includes(alias) ? [alias, ...hits] : hits;
  }, [q]);

  const pick = (c: Country) => { onChange(c); setOpen(false); setQ(""); };
  const nav = useListNav(items, pick, open);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 10); }, [open]);

  return (
    <div ref={anchor} className={clsx("relative", className)}>
      <button type="button" onClick={() => setOpen(!open)} className={fieldCls} aria-haspopup="listbox" aria-expanded={open}>
        {current ? <><span className="text-[16px] leading-none">{current.flag}</span><span className="flex-1 truncate">{current.name}</span></>
          : <span className="flex-1 truncate text-faint">{value || placeholder}</span>}
        {allowClear && current && (
          <span role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); onChange(null); }} className="grid h-5 w-5 place-items-center rounded-full text-faint hover:bg-page-alt hover:text-ink" aria-label="Clear">
            <IconX className="h-3 w-3" />
          </span>
        )}
        <IconChevronDown className={clsx("h-4 w-4 shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={panelCls(up)} role="listbox">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <IconSearch className="h-4 w-4 text-faint" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); nav.onKeyDown(e); }}
              placeholder="Search countries…" className="h-10 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-faint" />
          </div>
          <ul className="max-h-[280px] overflow-y-auto py-1 scroll-thin">
            {!q && <li className="mono px-3 pb-1 pt-2">Popular</li>}
            {items.map((c, i) => (
              <li key={c.code}>
                {!q && i === POPULAR.length && <p className="mono border-t border-line px-3 pb-1 pt-2.5">All countries</p>}
                <button type="button" onMouseEnter={() => nav.setActive(i)} onClick={() => pick(c)}
                  className={clsx("flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px]", i === nav.active && "bg-page-alt")}>
                  <span className="text-[16px] leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  {current?.code === c.code && <IconCheck className="h-3.5 w-3.5 text-brand" />}
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="px-3 py-6 text-center text-[12.5px] text-muted">No country matches “{q}”.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Several countries as chips — for "who you're targeting". */
export function CountryMulti({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => {
            const c = findCountry(name);
            return (
              <span key={name} className="inline-flex items-center gap-1.5 rounded-pill bg-page-alt py-1 pl-2.5 pr-1.5 text-[12.5px]">
                {c?.flag} {c?.name ?? name}
                <button type="button" onClick={() => onChange(value.filter((x) => x !== name))} className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-line hover:text-ink" aria-label={`Remove ${name}`}><IconX className="h-3 w-3" /></button>
              </span>
            );
          })}
        </div>
      )}
      <CountrySelect value="" placeholder="Add a country…" allowClear={false}
        onChange={(c) => c && !value.includes(c.name) && onChange([...value, c.name])} />
    </div>
  );
}

/* ── City ────────────────────────────────────────────────────────────── */

function useCitySearch(countryCode: string | undefined, q: string, open: boolean) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open || !countryCode) return;
    const ctl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/geo/cities?cc=${countryCode}&q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json()).then((d) => setCities(d.cities ?? [])).catch(() => {}).finally(() => setLoading(false));
    }, q ? 140 : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [countryCode, q, open]);
  return { cities, loading };
}

type Pickable = { kind: "city"; city: City } | { kind: "typed"; name: string };

function CityPanel({
  countryCode, up, selected, onPick, onClose, multi,
}: {
  countryCode?: string; up: boolean; selected: string[]; onPick: (name: string) => void; onClose: () => void; multi?: boolean;
}) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { cities, loading } = useCitySearch(countryCode, q, true);
  useEffect(() => { setTimeout(() => input.current?.focus(), 10); }, []);

  const items: Pickable[] = useMemo(() => {
    const list: Pickable[] = cities.map((c) => ({ kind: "city", city: c }));
    const typed = q.trim();
    if (typed && !cities.some((c) => c.name.toLowerCase() === typed.toLowerCase())) list.push({ kind: "typed", name: typed });
    return list;
  }, [cities, q]);

  const pick = useCallback((p: Pickable) => {
    onPick(p.kind === "city" ? p.city.name : p.name);
    setQ("");
    if (!multi) onClose();
  }, [onPick, onClose, multi]);
  const nav = useListNav(items, pick, true);

  // Same city name can exist twice in one country (Springfield, IL / MO): show the region then.
  const dupes = new Set(cities.map((c) => c.name).filter((n, i, a) => a.indexOf(n) !== i));

  return (
    <div className={panelCls(up)} role="listbox">
      <div className="flex items-center gap-2 border-b border-line px-3">
        <IconSearch className="h-4 w-4 text-faint" />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") onClose(); nav.onKeyDown(e); }}
          placeholder={countryCode ? "Search cities, towns, areas…" : "Type a city or area"} className="h-10 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-faint" />
        {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-ink" />}
      </div>
      <ul className="max-h-[280px] overflow-y-auto py-1 scroll-thin">
        {!q && countryCode && cities.length > 0 && <li className="mono px-3 pb-1 pt-2">Largest cities</li>}
        {items.map((p, i) => (
          <li key={p.kind === "city" ? `${p.city.name}-${p.city.admin}-${p.city.population}` : `typed-${p.name}`}>
            <button type="button" onMouseEnter={() => nav.setActive(i)} onClick={() => pick(p)}
              className={clsx("flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px]", i === nav.active && "bg-page-alt")}>
              {p.kind === "city" ? (
                <>
                  <IconPin className="h-3.5 w-3.5 shrink-0 text-faint" />
                  <span className="flex-1 truncate">{p.city.name}{(dupes.has(p.city.name) || /^[A-Z]{2,3}$/.test(p.city.admin ?? "")) && p.city.admin ? <span className="text-faint">, {p.city.admin}</span> : null}</span>
                  <span className="num text-[11.5px] text-faint">{fmtPop(p.city.population)}</span>
                  {selected.includes(p.city.name) && <IconCheck className="h-3.5 w-3.5 text-brand" />}
                </>
              ) : (
                <><IconPlus className="h-3.5 w-3.5 shrink-0 text-faint" /><span className="flex-1 truncate">Use “<span className="font-medium">{p.name}</span>” as typed</span></>
              )}
            </button>
          </li>
        ))}
        {!countryCode && !q && <li className="px-3 py-5 text-center text-[12.5px] text-muted">Pick a country first for suggestions — or type any place.</li>}
        {countryCode && !loading && !items.length && <li className="px-3 py-5 text-center text-[12.5px] text-muted">Start typing to search.</li>}
      </ul>
    </div>
  );
}

/** One city (or area). */
export function CitySelect({
  country, value, onChange, placeholder = "City or area",
}: { country: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { open, setOpen, up, anchor } = usePopover();
  const cc = findCountry(country)?.code;
  return (
    <div ref={anchor} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={fieldCls} aria-haspopup="listbox" aria-expanded={open}>
        <IconPin className="h-4 w-4 shrink-0 text-faint" />
        <span className={clsx("flex-1 truncate", !value && "text-faint")}>{value || placeholder}</span>
        {value && (
          <span role="button" tabIndex={-1} onClick={(e) => { e.stopPropagation(); onChange(""); }} className="grid h-5 w-5 place-items-center rounded-full text-faint hover:bg-page-alt hover:text-ink" aria-label="Clear"><IconX className="h-3 w-3" /></span>
        )}
        <IconChevronDown className={clsx("h-4 w-4 shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && <CityPanel countryCode={cc} up={up} selected={value ? [value] : []} onPick={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Several cities as chips — search them all in one go on Find leads. */
export function CityMulti({
  country, value, onChange, max = 8, placeholder = "Add cities or areas",
}: { country: string; value: string[]; onChange: (v: string[]) => void; max?: number; placeholder?: string }) {
  const { open, setOpen, up, anchor } = usePopover();
  const cc = findCountry(country)?.code;
  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((x) => x !== name));
    else if (value.length < max) onChange([...value, name]);
  };
  return (
    <div ref={anchor} className="relative">
      <div onClick={() => setOpen(true)} className={clsx(fieldCls, "cursor-text flex-wrap")} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}>
        <IconPin className="h-4 w-4 shrink-0 text-faint" />
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-pill bg-page-alt py-0.5 pl-2.5 pr-1 text-[12.5px]">
            {v}
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(v); }} className="grid h-4 w-4 place-items-center rounded-full text-muted hover:bg-line hover:text-ink" aria-label={`Remove ${v}`}><IconX className="h-2.5 w-2.5" /></button>
          </span>
        ))}
        <span className="flex-1 truncate text-faint">{value.length ? (value.length < max ? "Add another…" : `Up to ${max}`) : placeholder}</span>
        <IconChevronDown className={clsx("h-4 w-4 shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </div>
      {open && <CityPanel countryCode={cc} up={up} selected={value} onPick={toggle} onClose={() => setOpen(false)} multi />}
    </div>
  );
}
