import type { Prospect, ProspectInput } from "@/lib/types";
import { scoreProspect } from "@/lib/score";

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

/** Strip a URL down to its domain, so "https://www.acme.com/about" and "acme.com" match. */
export function domainOf(url: string | undefined | null) {
  if (!url) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/* Domains that belong to platforms, not to the business — a Facebook page or a
   Linktree link must never make two different businesses look like one. */
const SHARED_HOSTS = /(^|\.)(facebook|fb|instagram|twitter|x|linkedin|tiktok|youtube|wa|whatsapp|linktr|google|goo|business\.site|sites\.google|wix|wixsite|blogspot|wordpress|bit|tinyurl|jumia|konga|yelp|tripadvisor|booking)\.(com|me|ee|ly|gl|site|co|ng)$/i;

const SUFFIXES = /\b(ltd|limited|llc|inc|plc|co|company|nig|nigeria|enterprises?|ventures?|services?|group|the)\b/g;

/** "Harbour-Point Realty Ltd." → "harbour point realty" */
export function normName(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(SUFFIXES, " ").replace(/\s+/g, " ").trim();
}

/** Last 9 digits of a phone number, so +234 803…, 0803… and 803… all match. */
export function phoneKey(phone: string | undefined | null) {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 7 ? d.slice(-9) : "";
}

/**
 * Every way we might recognise the same business: its map listing, its own
 * website, its phone number, or its name in its city. Two records that share
 * any one of these are the same business — whichever source they came from.
 */
export function matchKeys(p: { name: string; city?: string; website?: string; phone?: string; source_ref?: string }): string[] {
  const keys: string[] = [];
  if (p.source_ref) keys.push(`ref:${p.source_ref}`);
  const d = domainOf(p.website);
  if (d && !SHARED_HOSTS.test(d)) keys.push(`web:${d}`);
  const t = phoneKey(p.phone);
  if (t) keys.push(`tel:${t}`);
  const n = normName(p.name);
  if (n) keys.push(`name:${n}|${(p.city ?? "").trim().toLowerCase()}`);
  return keys;
}

/** The key two records share if they are the same business. */
export function dedupeKey(p: Pick<Prospect, "name" | "city" | "website" | "source_ref">) {
  if (p.source_ref) return `ref:${p.source_ref}`;
  const d = domainOf(p.website);
  if (d) return `web:${d}`;
  return `name:${p.name.trim().toLowerCase()}|${(p.city || "").trim().toLowerCase()}`;
}

export function normaliseWebsite(url: string | undefined) {
  const s = (url || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

/** Fill every field so a half-filled import still produces a whole record. */
export function hydrate(input: ProspectInput, now = new Date().toISOString()): Prospect {
  const p: Prospect = {
    id: uid(),
    name: input.name.trim(),
    industry: input.industry ?? "other",
    country: input.country ?? "",
    city: input.city ?? "",
    address: input.address ?? "",
    website: normaliseWebsite(input.website),
    email: (input.email ?? "").trim().toLowerCase(),
    phone: (input.phone ?? "").trim(),
    contact_name: input.contact_name ?? "",
    contact_role: input.contact_role ?? "",
    linkedin: input.linkedin ?? "",
    size: input.size ?? "",
    source: input.source ?? "manual",
    source_ref: input.source_ref ?? "",
    rating: input.rating ?? null,
    reviews: input.reviews ?? null,
    stage: input.stage ?? "new",
    score: 0,
    deal_value: input.deal_value ?? null,
    tags: input.tags ?? [],
    notes: input.notes ?? "",
    audit: input.audit ?? null,
    next_follow_up: input.next_follow_up ?? null,
    last_contacted_at: input.last_contacted_at ?? null,
    share_id: input.share_id ?? null,
    mockup: input.mockup ?? null,
    report: input.report ?? null,
    views: input.views ?? 0,
    last_viewed_at: input.last_viewed_at ?? null,
    created_at: now,
    updated_at: now,
  };
  p.score = scoreProspect(p);
  return p;
}
