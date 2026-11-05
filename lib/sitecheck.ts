import "server-only";
import { lookup } from "node:dns/promises";
import { auditWebsite, nameTokens, siteKey, SOCIAL_HOSTS } from "@/lib/audit";
import type { Audit, Prospect, WebsiteCandidate, WebsiteLookup } from "@/lib/types";

/**
 * "Where does this business live online now?"
 *
 * The address on file goes stale: businesses move domains, let them lapse,
 * swap a site for an Instagram page, or never told the directory about the
 * one they have. This checks every lead the way a person would:
 *
 *  1. the address on file: does it load, forward somewhere, or show a
 *     parking / for-sale / suspended page? (the audit already reads this)
 *  2. their Google listing, fetched fresh: the website and phone they list
 *     today, and whether Google says they've closed
 *  3. the domain of their email (info@acme.ng → acme.ng)
 *  4. a handful of likely addresses from their name (acme.com, acme.com.ng…)
 *
 * Every candidate is opened and must mention the business (or its phone
 * number) before it counts. Nothing is changed automatically: the lead page
 * offers the suggestion and a person applies it.
 */

const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|proton|protonmail|zoho|yandex|mail|gmx)\./i;
const digits = (s: string) => s.replace(/\D/g, "").slice(-9);

const COUNTRY_TLDS: Record<string, string[]> = {
  NG: [".com", ".com.ng", ".ng", ".org.ng"], GH: [".com", ".com.gh"], KE: [".com", ".co.ke"], ZA: [".com", ".co.za"],
  GB: [".com", ".co.uk", ".uk"], US: [".com", ".net"], CA: [".com", ".ca"], AU: [".com", ".com.au"], IN: [".com", ".in", ".co.in"],
  AE: [".com", ".ae"], DE: [".com", ".de"], FR: [".com", ".fr"], IE: [".com", ".ie"],
};

function guesses(name: string, country: string) {
  const words = name.toLowerCase().normalize("NFKD").replace(/&/g, " and ").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const core = nameTokens(name);
  const slugs = new Set<string>();
  if (words.length) slugs.add(words.join(""));
  if (core.length) slugs.add(core.join(""));
  if (core.length > 1) slugs.add(core.slice(0, 2).join(""));
  if (words.length > 1) slugs.add(words.join("-"));
  const tlds = COUNTRY_TLDS[country?.toUpperCase()] ?? [".com", `.${(country || "com").toLowerCase()}`];
  const out: string[] = [];
  for (const s of [...slugs].filter((s) => s.length >= 4 && s.length <= 40).slice(0, 3)) for (const t of tlds) out.push(s + t);
  return out.slice(0, 10);
}

async function resolves(host: string) {
  try { await lookup(host); return true; } catch { return false; }
}

/** Their Google listing as it is today. */
async function listing(p: Pick<Prospect, "name" | "city" | "country" | "source_ref" | "phone">) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const mask = "id,displayName,websiteUri,businessStatus,internationalPhoneNumber,nationalPhoneNumber,formattedAddress";
  const id = p.source_ref?.startsWith("google:") ? p.source_ref.slice(7) : "";
  try {
    if (id) {
      const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask }, signal: AbortSignal.timeout(10_000) });
      if (r.ok) return (await r.json()) as Place;
    }
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask.split(",").map((f) => "places." + f).join(",") },
      body: JSON.stringify({ textQuery: [p.name, p.city, p.country].filter(Boolean).join(", "), pageSize: 5 }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const places = ((await r.json()).places ?? []) as Place[];
    const tokens = nameTokens(p.name);
    const phone = digits(p.phone || "");
    return places.find((x) => phone && digits(x.internationalPhoneNumber ?? x.nationalPhoneNumber ?? "") === phone)
      ?? places.find((x) => { const n = (x.displayName?.text ?? "").toLowerCase(); return tokens.length > 0 && tokens.every((t) => n.includes(t)); })
      ?? null;
  } catch { return null; }
}
type Place = { id: string; displayName?: { text: string }; websiteUri?: string; businessStatus?: string; internationalPhoneNumber?: string; nationalPhoneNumber?: string };

/** Open a candidate and decide whether it's really them. */
async function verify(url: string, p: Pick<Prospect, "name" | "phone">, source: WebsiteCandidate["source"], base: number): Promise<{ c: WebsiteCandidate; audit: Audit } | null> {
  const audit = await auditWebsite(url, { name: p.name });
  if (audit.site_state === "no_dns" || audit.site_state === "down") return null;
  const evidence: string[] = [];
  let confidence = base;
  if (audit.name_match) { evidence.push("mentions the business name"); confidence += 0.15; }
  const phone = digits(p.phone || "");
  if (phone && audit.phones.some((x) => digits(x) === phone)) { evidence.push("lists the same phone number"); confidence += 0.25; }
  if (audit.site_state && audit.site_state !== "ok") { evidence.push(`shows: ${audit.site_state.replace("_", " ")}`); confidence -= 0.4; }
  if (source === "guess" && !audit.name_match && !evidence.includes("lists the same phone number")) return null;
  const final = audit.moved_to ?? audit.final_url ?? url;
  return { c: { url: final, source, confidence: Math.max(0, Math.min(1, +confidence.toFixed(2))), state: audit.site_state, evidence }, audit };
}

export type LookupResult = {
  lookup: WebsiteLookup;
  /** A fresh audit of the address on file (none when there isn't one). */
  current?: Audit;
  /** A fresh audit of the suggestion, when there is one. */
  audit?: Audit;
  /** Their phone from Google, when the lead has none. */
  phone?: string;
};

export async function findWebsite(p: Pick<Prospect, "name" | "city" | "country" | "website" | "email" | "phone" | "source_ref" | "audit">): Promise<LookupResult> {
  const cands = new Map<string, { c: WebsiteCandidate; audit: Audit }>();
  const add = (x: { c: WebsiteCandidate; audit: Audit } | null) => {
    if (!x || SOCIAL_HOSTS.test(new URL(x.c.url).hostname)) return;
    const k = siteKey(x.c.url);
    const had = cands.get(k);
    if (!had) { cands.set(k, x); return; }
    // Seen twice from different places: more likely right.
    had.c.confidence = Math.min(1, +(Math.max(had.c.confidence, x.c.confidence) + 0.1).toFixed(2));
    had.c.evidence = [...new Set([...had.c.evidence, `also found via ${x.c.source}`])];
  };
  const onFile = p.website ? siteKey(p.website) : "";

  // 1. The address on file, freshly checked.
  const current = p.website ? await auditWebsite(p.website, { name: p.name }) : null;
  if (current?.moved_to && current.site_state === "moved") add(await verify(current.moved_to, p, "redirect", 0.7));
  if (current?.site_state === "ok") {
    cands.set(onFile, { c: { url: current.final_url ?? p.website, source: "listing", confidence: current.name_match === false ? 0.4 : 0.8, state: "ok", evidence: ["the address on file works"] }, audit: current });
  }

  // 2. Google listing today.
  const place = await listing(p);
  const listedPhone = place?.internationalPhoneNumber ?? place?.nationalPhoneNumber;
  if (place?.websiteUri) add(await verify(place.websiteUri, { ...p, phone: p.phone || listedPhone || "" }, "listing", 0.7));

  // 3. Their email's domain.
  const domain = p.email.split("@")[1]?.toLowerCase();
  if (domain && !FREE_MAIL.test(domain) && siteKey(domain) !== onFile) add(await verify(`https://${domain}`, p, "email", 0.6));

  // 4. Likely addresses, only when nothing solid turned up.
  const solid = [...cands.values()].some((x) => x.c.confidence >= 0.75 && x.c.state === "ok");
  if (!solid) {
    const hosts = guesses(p.name, p.country).filter((h) => siteKey(h) !== onFile);
    const live = (await Promise.all(hosts.map(async (h) => ((await resolves(h)) ? h : null)))).filter((h): h is string => !!h);
    for (const h of live.slice(0, 4)) add(await verify(`https://${h}`, p, "guess", 0.35));
  }

  const list = [...cands.values()].sort((a, b) => b.c.confidence - a.c.confidence);
  const best = list.find((x) => x.c.state === "ok" && x.c.confidence >= 0.6);
  const suggestion = best && siteKey(best.c.url) !== onFile ? best.c.url : undefined;
  const closed = place?.businessStatus && place.businessStatus !== "OPERATIONAL" ? place.businessStatus : undefined;
  const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");

  let summary: string;
  if (closed === "CLOSED_PERMANENTLY") summary = "Google lists this business as permanently closed.";
  else if (suggestion && current?.site_state === "moved") summary = `They've moved: the old address forwards to ${host(suggestion)}.`;
  else if (suggestion && p.website) summary = `Found a newer website: ${host(suggestion)} (${best!.c.evidence.join(", ") || best!.c.source}). The one on file ${current?.site_state === "ok" ? "still loads but looks older" : `shows: ${(current?.site_state ?? "nothing").replace("_", " ")}`}.`;
  else if (suggestion) summary = `Found a website we didn't have: ${host(suggestion)} (${best!.c.evidence.join(", ") || best!.c.source}).`;
  else if (current?.site_state === "social_only") summary = `The website just forwards to ${host(current.moved_to!)}; no real site found.`;
  else if (current?.site_state === "ok") summary = "The website on file is current.";
  else if (list.some((x) => x.c.source === "guess" && x.c.state === "ok")) summary = `Possibly ${list.filter((x) => x.c.source === "guess" && x.c.state === "ok").map((x) => host(x.c.url)).join(" or ")}: it mentions their name but nothing else confirms it. Check before using.`;
  else if (p.website) summary = `The website on file shows: ${(current?.site_state ?? "nothing").replace("_", " ")}. No replacement found.`;
  else summary = "No website found for them anywhere: a good lead for a new site.";

  return {
    lookup: {
      checked_at: new Date().toISOString(),
      business_status: place?.businessStatus,
      candidates: list.map((x) => x.c).slice(0, 6),
      suggestion,
      summary,
    },
    current: current ?? undefined,
    audit: suggestion ? best?.audit : undefined,
    phone: !p.phone ? listedPhone : undefined,
  };
}
