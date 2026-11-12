/**
 * The shapes everything else agrees on. Both stores (local file and Supabase)
 * read and write exactly these, so a screen never needs to know which one is
 * behind it.
 */

export const STAGES = [
  "new",
  "researching",
  "contacted",
  "replied",
  "meeting",
  "proposal",
  "won",
  "lost",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_META: Record<Stage, { label: string; hint: string; hue: string }> = {
  new:         { label: "New",         hint: "Found, not looked at yet",          hue: "var(--st-new)" },
  researching: { label: "Researching", hint: "Audited, pitch being written",      hue: "var(--st-research)" },
  contacted:   { label: "Contacted",   hint: "First message sent",                hue: "var(--st-contacted)" },
  replied:     { label: "Replied",     hint: "They wrote back",                   hue: "var(--st-replied)" },
  meeting:     { label: "Meeting",     hint: "Call or meeting booked",            hue: "var(--st-meeting)" },
  proposal:    { label: "Proposal",    hint: "Quote or proposal sent",            hue: "var(--st-proposal)" },
  won:         { label: "Won",         hint: "Signed. Paid, ideally",             hue: "var(--st-won)" },
  lost:        { label: "Lost",        hint: "Not now — revisit later",           hue: "var(--st-lost)" },
};

/** Stages that count as an open conversation (for the pipeline value). */
export const OPEN_STAGES: Stage[] = ["contacted", "replied", "meeting", "proposal"];

export type Size = "solo" | "small" | "medium" | "large" | "enterprise";
export const SIZES: { id: Size; label: string }[] = [
  { id: "solo", label: "Solo / 1–5" },
  { id: "small", label: "Small / 6–25" },
  { id: "medium", label: "Medium / 26–200" },
  { id: "large", label: "Large / 200–1,000" },
  { id: "enterprise", label: "Enterprise / 1,000+" },
];

export type Source = "manual" | "osm" | "google" | "csv" | "enquiry";

export type AuditIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  /** One line you could say to the owner, in their language not ours. */
  pitch: string;
};

export type PageSpeed = {
  checked_at: string;
  performance: number; // 0–100
  seo: number | null;
  accessibility: number | null;
  lcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  fcp_ms: number | null;
  /** Mobile screenshot as a data: URL (JPEG). */
  screenshot: string | null;
};

/**
 * What's actually at the address on file, beyond "does it load":
 * ok · moved (now lives at another domain) · social_only (redirects to a
 * Facebook/Instagram/Linktree page) · parked / for_sale / expired / suspended /
 * placeholder (the domain shows a holding page) · mismatch (the page doesn't
 * mention this business, so the domain may belong to someone else now) ·
 * no_dns (the domain doesn't exist any more) · down / error.
 */
export type SiteState =
  | "ok" | "moved" | "social_only" | "parked" | "for_sale" | "expired" | "suspended"
  | "placeholder" | "mismatch" | "blocked" | "no_dns" | "down" | "error";

/** Like httpstatus.io, plus the things a buyer would notice. */
export type SiteHealth = {
  checked_at: string;
  /** 0–100 */
  score: number;
  /** healthy · redirects · blocked (a firewall, not broken) · broken (4xx) · gone (410) · server_error (5xx) · offline · dns_failed */
  verdict: "healthy" | "redirects" | "blocked" | "broken" | "gone" | "server_error" | "offline" | "dns_failed";
  /** e.g. "Healthy: redirects (301 → 200)" */
  label: string;
  status: number | null;
  hops: { url: string; status: number }[];
  ttfb_ms: number | null;
  https_redirect: boolean | null;
  tls: { valid: boolean; days_left: number | null; issuer: string } | null;
  robots: boolean | null;
  sitemap: boolean | null;
  soft_404: boolean | null;
  headers: { hsts: boolean; csp: boolean; nosniff: boolean; frame: boolean; referrer: boolean } | null;
  links_checked: number;
  broken_links: { url: string; status: number | string }[];
  mixed_content: number;
  email: { mx: boolean; spf: boolean; dmarc: boolean } | null;
  issues: AuditIssue[];
};

export type WebsiteCandidate = {
  url: string;
  /** listing = their Google listing · redirect = the old address forwards there · email = their email's domain · page = linked from their own page · guess = we tried a likely address */
  source: "listing" | "redirect" | "email" | "page" | "guess";
  /** 0–1: how sure we are this is them. */
  confidence: number;
  state?: SiteState;
  evidence: string[];
};

export type WebsiteLookup = {
  checked_at: string;
  /** From Google: OPERATIONAL, CLOSED_TEMPORARILY or CLOSED_PERMANENTLY. */
  business_status?: string;
  candidates: WebsiteCandidate[];
  /** The best address found, when it isn't the one on file. */
  suggestion?: string;
  /** One line for the lead page. */
  summary: string;
};

export type Audit = {
  checked_at: string;
  url: string;
  final_url?: string;
  site_state?: SiteState;
  /** Where the business seems to live now, when the old address points elsewhere. */
  moved_to?: string;
  /** Every hop from the address on file to the page that loaded. */
  redirects?: string[];
  /** The page's own canonical address, when it names one. */
  canonical?: string;
  /** Whether the page mentions the business (only checked when a name is given). */
  name_match?: boolean;
  /** The last "where's their website now?" search, when one was run. */
  lookup?: WebsiteLookup;
  /** Technical health (status codes, certificate, links, email DNS…), when checked. */
  health?: SiteHealth;
  reachable: boolean;
  status?: number;
  load_ms?: number;
  https: boolean;
  title?: string;
  description?: string;
  /** Photos on their current site (share image first), for the mock-up. */
  images?: string[];
  logo?: string;
  mobile_ready: boolean;
  platform?: string;
  copyright_year?: number;
  has_analytics: boolean;
  has_contact_form: boolean;
  has_booking: boolean;
  has_whatsapp: boolean;
  emails: string[];
  phones: string[];
  socials: { network: string; url: string }[];
  page_kb?: number;
  issues: AuditIssue[];
  /** Google PageSpeed (mobile), when it was run. */
  pagespeed?: PageSpeed | null;
  /** 0–100. Higher means more wrong, i.e. more to sell. */
  opportunity: number;
};

export type Prospect = {
  id: string;
  name: string;
  industry: string;
  country: string;
  city: string;
  address: string;
  website: string;
  email: string;
  phone: string;
  contact_name: string;
  contact_role: string;
  linkedin: string;
  size: Size | "";
  source: Source;
  source_ref: string;
  rating: number | null;
  reviews: number | null;
  stage: Stage;
  score: number;
  deal_value: number | null;
  tags: string[];
  notes: string;
  audit: Audit | null;
  next_follow_up: string | null; // YYYY-MM-DD
  last_contacted_at: string | null;
  /** Random id for the public report and mock-up links. Null until first shared. */
  share_id: string | null;
  mockup: Mockup | null;
  /** Your edited version of the website report. Null = built fresh from the latest check. */
  report: ReportDoc | null;
  /** How many times they've opened a link you sent, and when last. */
  views: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** A business you removed: kept as match keys so it doesn't come back in searches. */
export type Suppressed = { key: string; name: string; prospect_id: string; removed_at: string };

export type MockupService = { title: string; body: string };

export type Mockup = {
  headline: string;
  tagline: string;
  about: string;
  services: MockupService[];
  highlights: string[];
  theme: string;
  cta: "whatsapp" | "call" | "email";
  /** Pictures for the page: the big one at the top, a few more further down, and their logo. */
  images?: { hero?: string; gallery?: string[]; logo?: string };
  updated_at: string;
};

/* ── Kymaa documents (same JSON shapes as kymaa-docs-v2) ──────────────── */

export type Impact = "high" | "medium" | "low";
export type Grade = "A" | "B" | "C" | "D" | "F";

export type ReportDoc = {
  checkedAt: string; // YYYY-MM-DD
  business: { name: string; domain: string; url: string };
  grade: Grade;
  verdict: string;
  summary: string;
  checksTotal: number;
  issues: { title: string; impact: Impact; why: string; fix: string }[];
  wins: { title: string; detail: string }[];
  recommendations: { title: string; detail: string }[];
  planTitle: string;
  preparer: { name: string; role: string; photo: string };
  cta: { primary: { label: string; url: string }; secondary: { label: string; url: string } | null };
  /** Show the phone screenshot + Google speed numbers (when a speed test was run). */
  showSpeed: boolean;
  updated_at?: string;
};

export type InvoiceStatus = "auto" | "due" | "overdue" | "paid" | "draft";

export type InvoiceDoc = {
  number: string;
  issuedAt: string;
  dueAt: string;
  reference: string;
  status: InvoiceStatus;
  currency: string;
  locale: string;
  from: { name: string; legalName: string; email: string; phone: string; address: string[] };
  client: { name: string; contact: string; email: string; address: string[] };
  items: { title: string; detail: string; qty: number; rate: number }[];
  discount: { label: string; type: "percent" | "amount"; value: number } | null;
  tax: { label: string; rate: number } | null;
  payments: { label: string; date: string; amount: number }[];
  payment: { bank: string; accountName: string; accountNumber: string; swift: string; link: string };
  terms: string;
  notes: string;
  thanks: string;
  website: string;
};

export type Invoice = {
  id: string;
  share_id: string;
  prospect_id: string | null;
  doc: InvoiceDoc;
  views: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProspectInput = Partial<Omit<Prospect, "id" | "created_at" | "updated_at">> & { name: string };

/** reply = they wrote back · meeting = a call or video meeting · payment = money in */
export type ActivityType = "note" | "email" | "whatsapp" | "call" | "linkedin" | "stage" | "audit" | "created" | "viewed" | "reply" | "meeting" | "payment";

export type Activity = {
  id: string;
  prospect_id: string;
  type: ActivityType;
  body: string;
  created_at: string;
};

import type { SavedView } from "@/lib/filters";

export type Settings = {
  your_name: string;
  business_name: string;
  role: string;
  sender_email: string;
  phone: string;
  website: string;
  booking_link: string;
  services: string[];
  proof: string; // case studies, results, portfolio in plain words
  signature: string;
  currency: string;
  target_industries: string[];
  target_countries: string[];
  daily_goal: number;
  /** Where share links point, e.g. https://leadget.vercel.app. Empty = this browser's address. */
  public_url: string;
  /** Businesses you delete stay out of search results for this many days. */
  forget_removed_days: number;
  tone: "warm" | "direct" | "formal";
  saved_views: SavedView[];

  /* Brand & documents (report + invoice) */
  legal_name: string;
  address: string; // one line per row
  photo_url: string;
  report_cta_label: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  swift: string;
  pay_link: string;
  invoice_prefix: string;
  invoice_due_days: number;
  invoice_terms: string;
  invoice_notes: string;
  invoice_thanks: string;
  tax_label: string;
  tax_rate: number;
};

export const DEFAULT_SETTINGS: Settings = {
  your_name: "",
  business_name: "",
  role: "Software developer",
  sender_email: "",
  phone: "",
  website: "",
  booking_link: "",
  services: ["Websites", "Mobile apps (Flutter)", "Web apps & dashboards", "Automation"],
  proof: "",
  signature: "",
  currency: "USD",
  target_industries: ["real-estate", "pharmacy", "law", "clinic"],
  target_countries: [],
  daily_goal: 10,
  public_url: "",
  forget_removed_days: 90,
  tone: "warm",
  saved_views: [],

  legal_name: "Kymaa Digital Solutions",
  address: "Lagos, Nigeria",
  photo_url: "/brand/photos/diwe-innocent.jpg",
  report_cta_label: "Talk to me about it",
  bank_name: "",
  account_name: "",
  account_number: "",
  swift: "",
  pay_link: "",
  invoice_prefix: "KYM",
  invoice_due_days: 14,
  invoice_terms: "50% deposit to begin, balance on launch.\nPayment within 14 days of the invoice date.",
  invoice_notes: "",
  invoice_thanks: "Thank you for building with us.",
  tax_label: "VAT",
  tax_rate: 0,
};

export type Template = {
  id: string;
  name: string;
  industry: string; // "" = any
  channel: "email" | "whatsapp" | "linkedin";
  subject: string;
  body: string;
  /** The swipe-file angle it came from, if any. */
  category?: string;
  created_at: string;
};

export type Pitch = {
  subject: string;
  body: string;
  whatsapp: string;
  followups: { day: number; subject: string; body: string }[];
  by: "ai" | "playbook";
};
