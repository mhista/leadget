import type { Audit, Grade, Prospect, ReportDoc, Settings } from "@/lib/types";
import { FIX } from "@/lib/report";
import { playbook } from "@/lib/industries";
import { waNumber } from "@/lib/links";

/**
 * Builds the Kymaa website-check report (same JSON as report.sample.json)
 * from a Leadget audit, following the grading, impact and copy rules in the
 * kymaa-docs README. Pure — used on the server and in the editor preview.
 */

export const GRADES: Record<Grade, { color: string; verdict: string }> = {
  A: { color: "#0678FF", verdict: "In great shape" },
  B: { color: "#0A3261", verdict: "Solid, with gaps" },
  C: { color: "#9A6700", verdict: "Room to improve" },
  D: { color: "#C2410C", verdict: "Needs work" },
  F: { color: "#9F1D1D", verdict: "Needs urgent work" },
};

/** Issues that on their own cap the grade at D. */
const HARD_FAIL = new Set(["down", "status", "bad-url", "parked", "https"]);

export function gradeFor(passed: number, total: number, hardFail = false): Grade {
  const share = total ? passed / total : 0;
  const g: Grade = share >= 0.9 ? "A" : share >= 0.75 ? "B" : share >= 0.6 ? "C" : share >= 0.4 ? "D" : "F";
  return hardFail && "ABC".includes(g) ? "D" : g;
}

export function summaryFor(name: string, issues: number, wins: number) {
  if (!issues) return `Nothing serious stood out on ${name}'s website. A few small improvements could still help.`;
  return `We found ${issues} thing${issues === 1 ? "" : "s"} that could be costing ${name} customers, and ${wins} that ${wins === 1 ? "is" : "are"} working well.`;
}

function wins(a: Audit) {
  const slow = a.issues.some((i) => ["slow", "ps-perf", "ps-lcp"].includes(i.id));
  const checks = [
    { ok: a.reachable, title: "Website loads", detail: "The site responds" },
    { ok: a.https, title: "Secure connection", detail: "Padlock shown in the browser" },
    { ok: a.mobile_ready, title: "Works on phones", detail: "Adapts to small screens" },
    { ok: !!a.load_ms && !slow, title: "Loads quickly", detail: a.load_ms ? `Homepage in about ${(a.load_ms / 1000).toFixed(1)}s` : "" },
    { ok: a.has_contact_form || a.has_whatsapp || a.has_booking, title: "Easy to get in touch", detail: [a.has_contact_form && "Enquiry form", a.has_whatsapp && "WhatsApp", a.has_booking && "Online booking"].filter(Boolean).join(", ") },
    { ok: !!a.title && !!a.description, title: "Set up for Google", detail: "Title and search description in place" },
    { ok: a.has_analytics, title: "Visitor analytics", detail: "They can see who visits" },
    { ok: a.socials.length > 0, title: "Linked to social profiles", detail: a.socials.slice(0, 3).map((s) => s.network).join(", ") },
  ];
  return a.reachable ? checks.filter((c) => c.ok).map(({ title, detail }) => ({ title, detail })) : [];
}

const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");

export function contactLinks(p: Pick<Prospect, "name">, s: Settings) {
  const first = s.your_name.split(" ")[0] || "there";
  const wa = s.phone ? `https://wa.me/${waNumber(s.phone)}?text=${encodeURIComponent(`Hi ${first}, I just read my website check.`)}` : "";
  const mail = s.sender_email ? `mailto:${s.sender_email}?subject=${encodeURIComponent(`Website check — ${p.name}`)}` : "";
  const site = s.website ? (/^https?:/.test(s.website) ? s.website : `https://${s.website}`) : "";
  return {
    primary: { label: s.report_cta_label || "Talk to me about it", url: wa || mail || s.booking_link || site },
    secondary: s.booking_link ? { label: "Book a free call", url: s.booking_link } : site && (wa || mail) ? { label: "See my work", url: site } : null,
  };
}

export function buildReport(p: Prospect, s: Settings): ReportDoc {
  const a = p.audit;
  const order = { high: 0, medium: 1, low: 2 } as const;
  const issues = [...(a?.issues ?? [])]
    .sort((x, y) => order[x.severity] - order[y.severity])
    .slice(0, 7)
    .map((i) => ({ title: i.title, impact: i.severity, why: FIX[i.id]?.why ?? i.pitch, fix: FIX[i.id]?.fix ?? "" }));
  const w = a ? wins(a) : [];
  const total = issues.length + w.length;
  const hard = !!a?.issues.some((i) => HARD_FAIL.has(i.id));
  const grade = gradeFor(w.length, total, hard);
  const url = a?.final_url || a?.url || p.website;
  const website = s.website ? host(s.website) : "";

  return {
    checkedAt: (a?.checked_at ?? new Date().toISOString()).slice(0, 10),
    business: { name: p.name, domain: host(url), url },
    grade,
    verdict: GRADES[grade].verdict,
    summary: summaryFor(p.name, issues.length, w.length),
    checksTotal: total,
    issues,
    wins: w.slice(0, 6),
    recommendations: playbook(p.industry).offers.slice(0, 4).map((title) => ({ title, detail: "" })),
    planTitle: `What I’d do for ${p.name}`,
    preparer: { name: s.your_name || s.business_name, role: [s.business_name, website].filter(Boolean).join(" · "), photo: s.photo_url },
    cta: contactLinks(p, s),
    showSpeed: !!a?.pagespeed,
  };
}

/** Saved edits if there are any, otherwise a fresh build from the latest check. */
export function reportFor(p: Prospect, s: Settings): ReportDoc {
  return p.report ? { ...buildReport(p, s), ...p.report } : buildReport(p, s);
}
