import type { Prospect, Size, Source, Stage } from "@/lib/types";

/**
 * Prospect filters, Apollo-style: every section narrows the list, values
 * inside a section are OR-ed ("real estate OR pharmacy"), sections are
 * AND-ed together. Saved views store exactly this object.
 */

export type WebsiteFilter =
  | "none" | "issues" | "down" | "insecure" | "not_mobile" | "slow" | "no_enquiry" | "stale" | "clean" | "unaudited";
export type ContactFilter = "email" | "phone" | "linkedin" | "named";
export type ActivityFilter = "any" | "never" | "contacted" | "due" | "quiet7" | "quiet14" | "no_followup";
export type AddedFilter = "any" | "today" | "7d" | "30d";

export type ProspectFilters = {
  q: string;
  stages: Stage[];
  industries: string[];
  countries: string[];
  cities: string[];
  sizes: Size[];
  sources: Source[];
  website: WebsiteFilter[];
  contact: ContactFilter[];
  activity: ActivityFilter;
  added: AddedFilter;
  tags: string[];
  scoreMin: number;
  ratingMin: number;
  reviewsMin: number;
  dealMin: number;
};

export const EMPTY_FILTERS: ProspectFilters = {
  q: "", stages: [], industries: [], countries: [], cities: [], sizes: [], sources: [], website: [], contact: [],
  activity: "any", added: "any", tags: [], scoreMin: 0, ratingMin: 0, reviewsMin: 0, dealMin: 0,
};

export type SavedView = { id: string; name: string; filters: ProspectFilters; builtin?: boolean };

export const WEBSITE_LABEL: Record<WebsiteFilter, string> = {
  none: "No website", issues: "Has issues", down: "Down / not loading", insecure: "Not secure (no HTTPS)",
  not_mobile: "Not mobile-ready", slow: "Slow (4.5s+)", no_enquiry: "No way to enquire", stale: "Looks unmaintained",
  clean: "Looks fine", unaudited: "Not audited yet",
};
export const CONTACT_LABEL: Record<ContactFilter, string> = { email: "Has email", phone: "Has phone", linkedin: "Has LinkedIn", named: "Named contact" };
export const ACTIVITY_LABEL: Record<ActivityFilter, string> = {
  any: "Any", never: "Never contacted", contacted: "Contacted at least once", due: "Follow-up due",
  quiet7: "No touch in 7+ days", quiet14: "No touch in 14+ days", no_followup: "No follow-up booked",
};
export const ADDED_LABEL: Record<AddedFilter, string> = { any: "Any time", today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" };

const has = (p: Prospect, id: string) => p.audit?.issues.some((i) => i.id === id) ?? false;

function websiteMatch(p: Prospect, f: WebsiteFilter) {
  switch (f) {
    case "none": return !p.website;
    case "unaudited": return !!p.website && !p.audit;
    case "down": return !!p.audit && !p.audit.reachable;
    case "issues": return !!p.audit && (!p.audit.reachable || p.audit.issues.length > 0);
    case "clean": return !!p.audit && p.audit.reachable && p.audit.issues.length === 0;
    case "insecure": return has(p, "https");
    case "not_mobile": return has(p, "mobile");
    case "slow": return has(p, "slow");
    case "no_enquiry": return has(p, "capture");
    case "stale": return has(p, "stale");
  }
}

function contactMatch(p: Prospect, f: ContactFilter) {
  return f === "email" ? !!p.email : f === "phone" ? !!p.phone : f === "linkedin" ? !!p.linkedin : !!p.contact_name;
}

export function applyFilters(list: Prospect[], f: ProspectFilters, now = Date.now()): Prospect[] {
  const needle = f.q.trim().toLowerCase();
  const today = new Date(now).toISOString().slice(0, 10);
  const daysAgo = (iso: string | null) => (iso ? (now - new Date(iso).getTime()) / 86400000 : Infinity);
  const cities = f.cities.map((c) => c.toLowerCase());
  return list.filter((p) => {
    if (f.stages.length && !f.stages.includes(p.stage)) return false;
    if (f.industries.length && !f.industries.includes(p.industry)) return false;
    if (f.countries.length && !f.countries.includes(p.country)) return false;
    if (cities.length && !cities.some((c) => p.city.toLowerCase().includes(c))) return false;
    if (f.sizes.length && !f.sizes.includes(p.size as Size)) return false;
    if (f.sources.length && !f.sources.includes(p.source)) return false;
    if (f.website.length && !f.website.some((w) => websiteMatch(p, w))) return false;
    if (f.contact.length && !f.contact.every((c) => contactMatch(p, c))) return false;
    if (f.tags.length && !f.tags.some((t) => p.tags.includes(t))) return false;
    if (p.score < f.scoreMin) return false;
    if (f.ratingMin && (p.rating ?? 0) < f.ratingMin) return false;
    if (f.reviewsMin && (p.reviews ?? 0) < f.reviewsMin) return false;
    if (f.dealMin && (p.deal_value ?? 0) < f.dealMin) return false;
    switch (f.activity) {
      case "never": if (p.last_contacted_at) return false; break;
      case "contacted": if (!p.last_contacted_at) return false; break;
      case "due": if (!p.next_follow_up || p.next_follow_up > today) return false; break;
      case "quiet7": if (!p.last_contacted_at || daysAgo(p.last_contacted_at) < 7) return false; break;
      case "quiet14": if (!p.last_contacted_at || daysAgo(p.last_contacted_at) < 14) return false; break;
      case "no_followup": if (p.next_follow_up || ["won", "lost"].includes(p.stage)) return false; break;
    }
    if (f.added !== "any") {
      const age = daysAgo(p.created_at);
      if (f.added === "today" ? p.created_at.slice(0, 10) !== today : age > (f.added === "7d" ? 7 : 30)) return false;
    }
    if (needle && ![p.name, p.city, p.country, p.email, p.contact_name, p.website, p.phone, p.notes, ...p.tags].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  });
}

export function activeCount(f: ProspectFilters) {
  let n = 0;
  for (const k of ["stages", "industries", "countries", "cities", "sizes", "sources", "website", "contact", "tags"] as const) n += f[k].length ? 1 : 0;
  n += f.activity !== "any" ? 1 : 0;
  n += f.added !== "any" ? 1 : 0;
  n += f.scoreMin ? 1 : 0;
  n += f.ratingMin ? 1 : 0;
  n += f.reviewsMin ? 1 : 0;
  n += f.dealMin ? 1 : 0;
  return n;
}

/** Ready-made views everyone gets. */
export const BUILTIN_VIEWS: SavedView[] = [
  { id: "hot", name: "Hot & not contacted", builtin: true, filters: { ...EMPTY_FILTERS, scoreMin: 65, activity: "never" } },
  { id: "nosite", name: "No website", builtin: true, filters: { ...EMPTY_FILTERS, website: ["none"], stages: ["new", "researching"] } },
  { id: "broken", name: "Broken or insecure sites", builtin: true, filters: { ...EMPTY_FILTERS, website: ["down", "insecure", "not_mobile"] } },
  { id: "audit", name: "Needs an audit", builtin: true, filters: { ...EMPTY_FILTERS, website: ["unaudited"] } },
  { id: "emailable", name: "Ready to email", builtin: true, filters: { ...EMPTY_FILTERS, contact: ["email"], activity: "never" } },
  { id: "due", name: "Follow-up due", builtin: true, filters: { ...EMPTY_FILTERS, activity: "due" } },
  { id: "quiet", name: "Gone quiet (14d+)", builtin: true, filters: { ...EMPTY_FILTERS, activity: "quiet14", stages: ["contacted", "replied", "meeting", "proposal"] } },
];
