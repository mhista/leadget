/**
 * Plans and monthly credits. One place to change prices and limits.
 *
 * A "search" is one Find-leads search (up to ~60 businesses back).
 * An "audit" is one website checked. "AI" is one AI-written pitch.
 * Prices are what the pricing page shows; the Paystack plan codes decide what
 * is actually charged, so keep the two in step.
 */
export type PlanId = "free" | "starter" | "pro";
export type Meter = "searches" | "audits" | "ai";

export type Plan = {
  id: PlanId;
  name: string;
  price_usd: number;
  price_ngn: number;
  blurb: string;
  limits: Record<Meter, number> & { prospects: number };
  features: string[];
  paystackEnv?: string;
};

export const PLANS: Plan[] = [
  {
    id: "free", name: "Free", price_usd: 0, price_ngn: 0,
    blurb: "Try it on a real market.",
    limits: { searches: 15, audits: 60, ai: 20, prospects: 200 },
    features: ["15 lead searches a month", "60 website audits", "20 AI pitches", "Swipe file & templates", "Pipeline and follow-ups"],
  },
  {
    id: "starter", name: "Starter", price_usd: 12, price_ngn: 15000,
    blurb: "For freelancers pitching every day.",
    limits: { searches: 200, audits: 1000, ai: 300, prospects: 5000 },
    features: ["200 lead searches a month", "1,000 website audits", "300 AI pitches", "Saved views", "CSV import & export"],
    paystackEnv: "PAYSTACK_PLAN_STARTER",
  },
  {
    id: "pro", name: "Pro", price_usd: 29, price_ngn: 39000,
    blurb: "For agencies and small teams.",
    limits: { searches: 1000, audits: 6000, ai: 1500, prospects: 50000 },
    features: ["1,000 lead searches a month", "6,000 website audits", "1,500 AI pitches", "Priority support", "Everything in Starter"],
    paystackEnv: "PAYSTACK_PLAN_PRO",
  },
];

export const PLAN = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;

export const METER_LABEL: Record<Meter, string> = { searches: "Lead searches", audits: "Website audits", ai: "AI pitches" };

export const period = (d = new Date()) => d.toISOString().slice(0, 7); // "2026-09"
