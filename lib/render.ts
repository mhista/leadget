import type { Prospect, Settings } from "@/lib/types";
import { playbook } from "@/lib/industries";

/**
 * Filling templates. Pure — used in the browser (instant previews) and on the
 * server alike.
 */

export const TEMPLATE_VARS = [
  "first_name", "company", "city", "country", "industry", "website", "issue", "pain", "offer", "hook", "reviews",
  "report_link", "mockup_link", "my_name", "my_business", "booking_link", "signature",
];

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function firstName(full: string) {
  const n = full.trim().replace(/^(dr|mr|mrs|ms|miss|prof|barr|pharm|engr)\.?\s+/i, "").split(/\s+/)[0];
  return n && n.length > 1 ? n : "";
}

export function signOff(s: Settings) {
  if (s.signature.trim()) return s.signature.trim();
  return [s.your_name, [s.role, s.business_name].filter(Boolean).join(", "), s.website, s.phone].filter(Boolean).join("\n");
}

const rank = (sev: string) => (sev === "high" ? 0 : sev === "medium" ? 1 : 2);

export function templateVars(p: Prospect, s: Settings): Record<string, string> {
  const pb = playbook(p.industry);
  const top = [...(p.audit?.issues ?? [])].sort((a, b) => rank(a.severity) - rank(b.severity))[0];
  const first = firstName(p.contact_name);
  return {
    first_name: first || "there",
    company: p.name,
    business: p.name, // older templates used {{business}}
    city: p.city || p.country || "your area",
    country: p.country || "your country",
    industry: pb.label.toLowerCase(),
    website: p.website,
    issue: top?.pitch ?? (!p.website ? `${p.name} doesn't have a website yet, so people who search for you have nowhere to click.` : "[something specific you noticed on their site]"),
    pain: lower(pb.pains[0]),
    offer: lower(pb.offers[0]),
    hook: pb.hook,
    reviews: p.reviews ? String(p.reviews) : "[number of]",
    report_link: p.share_id && p.audit ? `${(s.public_url || "").replace(/\/$/, "")}/r/${p.share_id}` : "[report link — make the report first]",
    mockup_link: p.share_id && p.mockup ? `${(s.public_url || "").replace(/\/$/, "")}/m/${p.share_id}` : "[mock-up link — make the mock-up first]",
    my_name: s.your_name || "[your name]",
    my_business: s.business_name || s.your_name || "[your business]",
    booking_link: s.booking_link || "[booking link]",
    signature: signOff(s) || "[your name]",
  };
}

export function renderTemplate(t: { subject: string; body: string }, p: Prospect, s: Settings) {
  const vars = templateVars(p, s);
  const fill = (x: string) => x.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] ?? m);
  return { subject: fill(t.subject), body: fill(t.body) };
}

/** [square bracket] fill-ins still waiting to be written. */
export function brackets(text: string) {
  return [...text.matchAll(/\[[^\]\n]{2,160}\]/g)].map((m) => ({ text: m[0], index: m.index! }));
}
