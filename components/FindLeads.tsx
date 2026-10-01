"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { importFound, searchBusinesses } from "@/lib/actions";
import type { Found } from "@/lib/discover";
import { PLAYBOOKS } from "@/lib/industries";
import { findCountry } from "@/lib/geo/countries";
import { btn, inputCls, selectCls, Field, Notice } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { Check, Spinner } from "@/components/controls";
import { CityMulti, CountrySelect } from "@/components/PlacePicker";
import { IconCheck, IconExternal, IconGlobe, IconPhone, IconPin, IconSearch, IconStar, IconZap, IconMail, IconSparkle, IconX } from "@/components/icons";

type Row = Found & { already?: boolean; status?: "added" | "removed" | null };

const IDEAS = [
  { industry: "real-estate", cities: ["Dubai"], country: "United Arab Emirates" },
  { industry: "pharmacy", cities: ["Houston"], country: "United States" },
  { industry: "law", cities: ["London"], country: "United Kingdom" },
  { industry: "clinic", cities: ["Nairobi"], country: "Kenya" },
  { industry: "hotel", cities: ["Accra"], country: "Ghana" },
  { industry: "dental", cities: ["Toronto"], country: "Canada" },
  { industry: "real-estate", cities: ["Lekki", "Ikeja"], country: "Nigeria" },
  { industry: "school", cities: ["Abuja"], country: "Nigeria" },
];

type ResultFilters = {
  website: "all" | "none" | "has";
  phone: boolean;
  email: boolean;
  ratingMin: number;
  reviewsMin: number;
  hideAdded: boolean;
  hideClosed: boolean;
  text: string;
  sort: "relevance" | "reviews" | "rating" | "name";
};
const NO_RF: ResultFilters = { website: "all", phone: false, email: false, ratingMin: 0, reviewsMin: 0, hideAdded: true, hideClosed: true, text: "", sort: "relevance" };

/** The angle to open with, straight from what the search already knows. */
function angleFor(r: Row) {
  if (!r.website && (r.reviews ?? 0) >= 10) return { label: "No site, but reviewed", tone: "text-warning" };
  if (!r.website) return { label: "Offer a mock-up", tone: "text-warning" };
  if (r.website.startsWith("http://")) return { label: "Not secure — lead with it", tone: "text-danger" };
  if ((r.reviews ?? 0) >= 100) return { label: "Compliment the reviews", tone: "text-success" };
  return { label: "Audit first", tone: "text-muted" };
}

export function FindLeads({ google, defaultIndustry, defaultCountry }: { google: boolean; defaultIndustry: string; defaultCountry: string }) {
  const toast = useToast();
  const [industry, setIndustry] = useState(defaultIndustry);
  const [keyword, setKeyword] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [country, setCountry] = useState(defaultCountry);
  const [source, setSource] = useState<"google" | "osm">(google ? "google" : "osm");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<{ query: string; source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [rf, setRf] = useState<ResultFilters>(NO_RF);
  const [showRf, setShowRf] = useState(false);
  const [audit, setAudit] = useState(true);
  const [searching, startSearch] = useTransition();
  const [importing, startImport] = useTransition();
  const [added, setAdded] = useState<{ n: number; skipped: number } | null>(null);

  function search(e?: React.FormEvent, over?: { industry: string; cities: string[]; country: string }) {
    e?.preventDefault();
    const q = over ?? { industry, cities, country };
    setError(null); setAdded(null);
    startSearch(async () => {
      const res = await searchBusinesses({ ...q, keyword, source });
      if (!res.ok) { setError(res.error); setRows(null); return; }
      setRows(res.results);
      setMeta({ query: res.query, source: res.source });
      setRf(NO_RF);
      setPicked(new Set(res.results.filter((r) => !r.already && !r.closed).map((r) => r.source_ref)));
    });
  }

  const shown = useMemo(() => {
    const t = rf.text.trim().toLowerCase();
    const r = (rows ?? []).filter((x) =>
      (rf.website === "all" || (rf.website === "none" ? !x.website : !!x.website)) &&
      (!rf.phone || !!x.phone) && (!rf.email || !!x.email) &&
      (x.rating ?? 0) >= rf.ratingMin && (x.reviews ?? 0) >= rf.reviewsMin &&
      (!rf.hideAdded || !x.already) && (!rf.hideClosed || !x.closed) &&
      (!t || `${x.name} ${x.category} ${x.address}`.toLowerCase().includes(t)),
    );
    if (rf.sort === "reviews") r.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
    if (rf.sort === "rating") r.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (rf.sort === "name") r.sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [rows, rf]);

  const rfActive = Object.entries(rf).filter(([k, v]) => !["sort", "hideClosed", "hideAdded"].includes(k) && v !== (NO_RF as any)[k]).length;
  const selected = (rows ?? []).filter((r) => picked.has(r.source_ref) && !r.already);
  const stats = useMemo(() => {
    const all = rows ?? [];
    const r = all.filter((x) => !x.already);
    return {
      total: r.length, nosite: r.filter((x) => !x.website).length, site: r.filter((x) => x.website).length, phone: r.filter((x) => x.phone).length,
      added: all.filter((x) => x.status === "added" || (x.already && !x.status)).length,
      removed: all.filter((x) => x.status === "removed").length,
    };
  }, [rows]);

  function toggle(ref: string) {
    setPicked((s) => { const n = new Set(s); n.has(ref) ? n.delete(ref) : n.add(ref); return n; });
  }
  function toggleAll() {
    const refs = shown.filter((r) => !r.already).map((r) => r.source_ref);
    const all = refs.every((r) => picked.has(r));
    setPicked((s) => { const n = new Set(s); refs.forEach((r) => (all ? n.delete(r) : n.add(r))); return n; });
  }

  function add() {
    startImport(async () => {
      const res = await importFound(selected, industry, audit);
      if (!res.ok) { toast(res.error, "error"); return; }
      setAdded({ n: res.data.created, skipped: res.data.skipped });
      setRows((rs) => rs?.map((r) => (picked.has(r.source_ref) ? { ...r, already: true } : r)) ?? null);
      setPicked(new Set());
      const audited = (res.data as { audited?: number }).audited ?? 0;
      toast(`Added ${res.data.created} prospect${res.data.created === 1 ? "" : "s"}${audited ? ` and audited ${audited} website${audited === 1 ? "" : "s"}` : ""}.`);
    });
  }

  const flag = findCountry(country)?.flag;

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="card animate-rise">
        <div className="border-b border-line p-5">
          <p className="mb-3 text-[12px] font-medium">Industry</p>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scroll-thin sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {PLAYBOOKS.filter((p) => p.id !== "other").map((p) => (
              <button
                type="button" key={p.id} onClick={() => setIndustry(p.id)}
                className={clsx(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-pill border px-3.5 text-[13px] transition-all duration-200",
                  industry === p.id ? "border-ink bg-ink text-page shadow-soft" : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span>{p.emoji}</span>{p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:items-end">
          <Field label="Country">
            <CountrySelect value={country} onChange={(c) => { setCountry(c?.name ?? ""); setCities([]); }} placeholder="Anywhere — pick a country" />
          </Field>
          <Field label="Cities or areas" hint="Search up to 8 at once.">
            <CityMulti country={country} value={cities} onChange={setCities} placeholder={country ? `Search ${country}…` : "Pick a country for suggestions"} />
          </Field>
          <Field label="Refine (optional)">
            <input className={inputCls} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. luxury real estate, 24-hour pharmacy" />
          </Field>
          <button className={btn("primary", "md", "h-[38px] w-full self-start lg:mt-[22px] lg:w-auto")} disabled={searching || (!cities.length && !country)}>
            {searching ? <Spinner /> : <IconSearch />} {searching ? "Searching…" : `Search${cities.length > 1 ? ` ${cities.length} areas` : ""}`}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-[14px] border-t border-line bg-sunken px-5 py-3">
          <div className="flex items-center gap-1 rounded-pill bg-page-alt p-1 text-[12px]">
            {(["google", "osm"] as const).map((s) => (
              <button type="button" key={s} onClick={() => setSource(s)} disabled={s === "google" && !google}
                className={clsx("rounded-pill px-3 py-1 transition-colors disabled:opacity-40", source === s ? "bg-surface text-ink shadow-soft" : "text-muted")}>
                {s === "google" ? "Google Maps" : "OpenStreetMap"}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted">
            {google ? "Google gives the best data: websites, phones and review counts." : <>Using OpenStreetMap (free). Add a <Link href="/settings#keys" className="underline underline-offset-2">Google Places key</Link> for much better results.</>}
          </p>
        </div>
      </form>

      {!rows && !searching && !error && (
        <div className="animate-rise [animation-delay:80ms]">
          <p className="mono mb-3">Try a market</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {IDEAS.map((i) => {
              const pb = PLAYBOOKS.find((p) => p.id === i.industry)!;
              return (
                <button key={i.industry + i.cities.join()} type="button"
                  onClick={() => { setIndustry(i.industry); setCities(i.cities); setCountry(i.country); search(undefined, i); }}
                  className="card group flex items-center gap-3 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-page-alt text-[18px]">{pb.emoji}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium">{pb.label}</span>
                    <span className="block truncate text-[12px] text-muted">{findCountry(i.country)?.flag} {i.cities.join(" + ")}, {i.country}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <Notice tone="danger">{error}</Notice>}

      {searching && (
        <div className="card space-y-3 p-5">
          <p className="text-[12.5px] text-muted">{cities.length > 1 ? `Searching ${cities.length} areas, one after another…` : "Searching…"}</p>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-10" style={{ opacity: 1 - i * 0.12 }} />)}
        </div>
      )}

      {rows && !searching && (
        <div className="card overflow-hidden animate-rise">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[14px] font-semibold">{flag} {stats.total} new business{stats.total === 1 ? "" : "es"} <span className="font-normal text-muted">for “{meta?.query}”</span></h2>
              <p className="mt-0.5 text-[12px] text-muted">
                <span className="font-medium text-warning">{stats.nosite} with no website</span> · {stats.site} with a site to audit · {stats.phone} with a phone number
              </p>
              {(stats.added > 0 || stats.removed > 0) && (
                <p className="mt-1 text-[12px] text-faint">
                  {rf.hideAdded ? "Hiding" : "Showing"} {[stats.added && `${stats.added} already in your list`, stats.removed && `${stats.removed} you removed recently`].filter(Boolean).join(" and ")}
                  {" · "}<button onClick={() => setRf({ ...rf, hideAdded: !rf.hideAdded })} className="underline underline-offset-2 hover:text-ink">{rf.hideAdded ? "show them" : "hide them"}</button>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-pill bg-page-alt p-1 text-[12px]">
                {([["all", "All"], ["none", "No website"], ["has", "Has website"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setRf({ ...rf, website: k })} className={clsx("rounded-pill px-3 py-1 transition-colors", rf.website === k ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}>{l}</button>
                ))}
              </div>
              <button onClick={() => setShowRf(!showRf)} className={btn(showRf || rfActive ? "primary" : "secondary", "sm")}>
                Filters{rfActive ? ` · ${rfActive}` : ""}
              </button>
            </div>
          </div>

          {showRf && (
            <div className="grid gap-4 border-b border-line bg-sunken px-5 py-4 sm:grid-cols-2 lg:grid-cols-5 animate-rise">
              <Field label="Name or category contains"><input className={clsx(inputCls, "bg-surface")} value={rf.text} onChange={(e) => setRf({ ...rf, text: e.target.value })} placeholder="e.g. luxury" /></Field>
              <Field label="Min. rating">
                <select className={clsx(selectCls, "bg-surface")} value={rf.ratingMin} onChange={(e) => setRf({ ...rf, ratingMin: Number(e.target.value) })}>
                  {[0, 3, 3.5, 4, 4.5].map((n) => <option key={n} value={n}>{n ? `${n}★ and up` : "Any"}</option>)}
                </select>
              </Field>
              <Field label="Min. reviews" hint="More reviews = established, can pay.">
                <select className={clsx(selectCls, "bg-surface")} value={rf.reviewsMin} onChange={(e) => setRf({ ...rf, reviewsMin: Number(e.target.value) })}>
                  {[0, 10, 25, 50, 100, 250].map((n) => <option key={n} value={n}>{n ? `${n}+` : "Any"}</option>)}
                </select>
              </Field>
              <Field label="Sort by">
                <select className={clsx(selectCls, "bg-surface")} value={rf.sort} onChange={(e) => setRf({ ...rf, sort: e.target.value as ResultFilters["sort"] })}>
                  <option value="relevance">Relevance</option><option value="reviews">Most reviews</option><option value="rating">Highest rated</option><option value="name">Name A–Z</option>
                </select>
              </Field>
              <div className="space-y-2 pt-5 text-[12.5px]">
                <label className="flex items-center gap-2"><Check checked={rf.phone} onChange={() => setRf({ ...rf, phone: !rf.phone })} /> Has phone</label>
                <label className="flex items-center gap-2"><Check checked={rf.email} onChange={() => setRf({ ...rf, email: !rf.email })} /> Has email</label>
                <label className="flex items-center gap-2"><Check checked={rf.hideAdded} onChange={() => setRf({ ...rf, hideAdded: !rf.hideAdded })} /> Hide ones I've added or removed</label>
                <label className="flex items-center gap-2"><Check checked={rf.hideClosed} onChange={() => setRf({ ...rf, hideClosed: !rf.hideClosed })} /> Hide closed businesses</label>
              </div>
              {rfActive > 0 && <button onClick={() => setRf({ ...NO_RF })} className="justify-self-start text-[12px] text-muted underline underline-offset-2 hover:text-ink lg:col-span-5"><IconX className="inline h-3 w-3" /> Clear filters</button>}
            </div>
          )}

          {shown.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-muted">
              {rows.length && rows.every((x) => x.already)
                ? "You've already got every business this search found. Try another area, a nearby city, or a different industry."
                : "Nothing here. Loosen the filters, try a nearby area, or switch data source."}
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-auto scroll-thin">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
                  <tr className="border-b border-line text-[11.5px] text-muted">
                    <th className="w-10 px-5 py-2.5"><Check checked={shown.filter((r) => !r.already).every((r) => picked.has(r.source_ref)) && shown.some((r) => !r.already)} onChange={toggleAll} /></th>
                    <th className="px-2 py-2.5 font-medium">Business</th>
                    <th className="hidden px-2 py-2.5 font-medium md:table-cell">Website</th>
                    <th className="hidden px-2 py-2.5 font-medium lg:table-cell">Contact</th>
                    <th className="hidden px-2 py-2.5 font-medium xl:table-cell">Suggested angle</th>
                    <th className="px-5 py-2.5 text-right font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {shown.map((r, i) => {
                      const a = angleFor(r);
                      return (
                        <motion.tr
                          key={r.source_ref}
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.012, 0.35) }}
                          onClick={() => !r.already && toggle(r.source_ref)}
                          className={clsx("border-b border-line/70 transition-colors", r.already ? "opacity-50" : "cursor-pointer hover:bg-sunken", picked.has(r.source_ref) && !r.already && "bg-accent/[.07]")}
                        >
                          <td className="px-5 py-3">{r.already ? <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-success text-white"><IconCheck className="h-3 w-3" /></span> : <Check checked={picked.has(r.source_ref)} onChange={() => toggle(r.source_ref)} />}</td>
                          <td className="max-w-[320px] px-2 py-3">
                            <p className="truncate font-medium">{r.name} {r.already && <span className="ml-1 text-[11px] font-normal text-muted">· {r.status === "removed" ? "you removed this" : "in your list"}</span>}{r.closed && <span className="ml-1 text-[11px] font-normal text-danger">· closed</span>}</p>
                            <p className="flex items-center gap-1 truncate text-[12px] text-muted"><IconPin className="h-3 w-3 shrink-0" />{r.address || r.city}{r.category ? ` · ${r.category}` : ""}</p>
                          </td>
                          <td className="hidden px-2 py-3 md:table-cell">
                            {r.website ? (
                              <a href={r.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex max-w-[200px] items-center gap-1 truncate text-muted hover:text-ink">
                                <IconGlobe className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{r.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span><IconExternal className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-pill bg-warning/10 px-2 py-0.5 text-[11.5px] font-medium text-warning"><IconZap className="h-3 w-3" />No website</span>
                            )}
                          </td>
                          <td className="hidden px-2 py-3 text-muted lg:table-cell">
                            <span className="flex items-center gap-2">
                              {r.phone ? <span className="inline-flex items-center gap-1"><IconPhone className="h-3.5 w-3.5" />{r.phone}</span> : <span className="text-faint">—</span>}
                              {r.email && <IconMail className="h-3.5 w-3.5 text-ink" />}
                            </span>
                          </td>
                          <td className="hidden px-2 py-3 xl:table-cell"><span className={clsx("inline-flex items-center gap-1 text-[12px]", a.tone)}><IconSparkle className="h-3 w-3" />{a.label}</span></td>
                          <td className="px-5 py-3 text-right">
                            {r.rating ? <span className="num inline-flex items-center gap-1"><IconStar className="h-3.5 w-3.5 fill-warning text-warning" />{r.rating.toFixed(1)} <span className="text-faint">({r.reviews ?? 0})</span></span> : <span className="text-faint">—</span>}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-5 py-3.5">
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <Check checked={audit} onChange={() => setAudit(!audit)} />
              Audit their websites as they&apos;re added <span className="hidden text-faint sm:inline">(slower, but you get something to say)</span>
            </label>
            <div className="flex items-center gap-3">
              {added && <Link href="/prospects?view=added" className="text-[12.5px] text-success">Added {added.n}{added.skipped ? `, ${added.skipped} already there` : ""} → pitch them</Link>}
              <button onClick={add} disabled={!selected.length || importing} className={btn("accent", "md")}>
                {importing ? <><Spinner /> {audit ? "Adding & auditing…" : "Adding…"}</> : <>Add {selected.length} to prospects</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
