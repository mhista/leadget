import type { Prospect } from "@/lib/types";

/**
 * Lead score, 0–100: "how worth my next hour is this business?"
 *
 * Three questions, weighted by how much each one actually decides a sale:
 *   1. Is there something to fix?     (up to 40) — no site, or an audit full of problems
 *   2. Can I reach a decision-maker?  (up to 35) — email, named contact, phone
 *   3. Can they pay?                  (up to 25) — size, reviews, an established presence
 *
 * It is a sorting aid, not a verdict. Every point is explained by
 * scoreReasons() so the number on the screen is never a mystery.
 */
export function scoreProspect(p: Prospect): number {
  return Math.min(100, Math.round(scoreReasons(p).reduce((n, r) => n + r.points, 0)));
}

export function scoreReasons(p: Prospect): { label: string; points: number }[] {
  const out: { label: string; points: number }[] = [];

  // 1. Opportunity
  if (!p.website) {
    out.push({ label: "No website — the whole build is the opportunity", points: 32 });
  } else if (p.audit) {
    if (!p.audit.reachable) out.push({ label: "Website is down or unreachable", points: 36 });
    else out.push({ label: `Website audit: ${p.audit.issues.length} issue${p.audit.issues.length === 1 ? "" : "s"}`, points: Math.round(p.audit.opportunity * 0.4) });
  } else {
    out.push({ label: "Has a website (not audited yet)", points: 12 });
  }

  // 2. Reachability
  if (p.email) out.push({ label: "Email address", points: 18 });
  if (p.contact_name) out.push({ label: "Named contact", points: 9 });
  if (p.phone) out.push({ label: "Phone number", points: 8 });
  if (p.linkedin) out.push({ label: "LinkedIn", points: 3 });

  // 3. Ability to pay
  const sizePts: Record<string, number> = { solo: 2, small: 7, medium: 13, large: 17, enterprise: 18 };
  if (p.size) out.push({ label: `Size: ${p.size}`, points: sizePts[p.size] ?? 0 });
  if (p.reviews != null && p.reviews > 0) {
    const pts = p.reviews >= 200 ? 7 : p.reviews >= 50 ? 5 : p.reviews >= 10 ? 3 : 1;
    out.push({ label: `${p.reviews} public reviews`, points: pts });
  }
  if (p.deal_value && p.deal_value >= 5000) out.push({ label: "Large potential deal", points: 4 });

  return out;
}

export function scoreBand(score: number): { label: string; tone: "hot" | "warm" | "cold" } {
  if (score >= 65) return { label: "Hot", tone: "hot" };
  if (score >= 40) return { label: "Warm", tone: "warm" };
  return { label: "Cold", tone: "cold" };
}
