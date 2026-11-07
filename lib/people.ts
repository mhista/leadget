import "server-only";
import { PRIVATE_HOST, UA, siteKey } from "@/lib/audit";
import { ROLE, verifyEmail, type EmailStatus } from "@/lib/verify";

/**
 * Who to write to: the decision makers behind a business, with their email.
 * Our own Apollo/Clay, built from free sources first:
 *
 *   1. their website: team / about / leadership / contact pages, structured
 *      data (schema.org Person), mailto links, LinkedIn profile links, and
 *      "Name — Title" text near job titles
 *   2. Hunter domain search (HUNTER_API_KEY, free tier ~25 searches a month)
 *   3. Apollo people search (APOLLO_API_KEY; the search itself costs no
 *      credits; revealing an email does, so that's opt-in)
 *   4. the company's email pattern (from addresses we found, or Hunter's),
 *      applied to each decision maker's name, then verified
 *
 * Names and titles are only ever what a source says; emails we guessed are
 * marked as guesses and must pass verification before they're used.
 */

export type Seniority = "owner" | "founder" | "c_suite" | "partner" | "vp" | "head" | "director" | "manager" | "senior" | "entry" | "unknown";
export type PersonSource = "website" | "hunter" | "apollo" | "pattern" | "import" | "manual";

export type Person = {
  name: string;
  first: string;
  last: string;
  title: string;
  seniority: Seniority;
  /** Owner, founder, C-level, partner, director or head of something. */
  decision_maker: boolean;
  email: string;
  email_status: EmailStatus | "";
  /** Where the email came from (a guess from the pattern is "pattern"). */
  email_source: PersonSource | "";
  email_reason: string;
  linkedin: string;
  phone: string;
  /** Where the person came from. */
  sources: PersonSource[];
  /** 0–100: how sure we are this person and email are right. */
  confidence: number;
  /** Apollo's id, to reveal their email later (costs a credit). */
  apollo_id?: string;
};

export type PeopleResult = {
  domain: string;
  people: Person[];
  /** Shared inboxes found (info@, hello@…). */
  company_emails: string[];
  /** e.g. "{first}.{last}" */
  pattern: string | null;
  catch_all: boolean | null;
  pages: string[];
  used: string[];
  notes: string[];
};

const RANK: Seniority[] = ["owner", "founder", "c_suite", "partner", "vp", "head", "director", "manager", "senior", "entry", "unknown"];
export const rankOf = (s: Seniority) => RANK.indexOf(s);

/** What a job title says about seniority. */
export function seniorityOf(title: string): Seniority {
  const t = title.toLowerCase();
  if (/\b(owner|proprietor|proprietress)\b/.test(t)) return "owner";
  if (/\bfound(er|ing)\b|co-?founder/.test(t)) return "founder";
  if (/\b(ceo|cfo|coo|cto|cmo|cio|cpo|chief|president|chair(man|woman|person)?|managing director|\bmd\b|executive director|general manager|gm\b|principal\b|medical director)/.test(t)) return "c_suite";
  if (/\b(managing partner|senior partner|name partner|partner)\b/.test(t)) return "partner";
  if (/\b(vice president|vp|svp|evp)\b/.test(t)) return "vp";
  if (/\bhead of\b|\blead\b/.test(t)) return "head";
  if (/\bdirector\b/.test(t)) return "director";
  if (/\bmanager\b|\bsupervisor\b|\bcoordinator\b/.test(t)) return "manager";
  if (/\bsenior\b|\bsr\.?\b|\bprincipal attorney\b|\bconsultant\b|\battorney\b|\blawyer\b|\bsolicitor\b|\bbarrister\b|\bdoctor\b|\bdr\b|\bspecialist\b/.test(t)) return "senior";
  return t.trim() ? "entry" : "unknown";
}
export const isDecisionMaker = (s: Seniority, title = "") => rankOf(s) <= rankOf("director") || /principal attorney|managing attorney|founding attorney/i.test(title);

const TITLE_WORDS = "(?:co-?founder|founder|owner|proprietor|ceo|cfo|coo|cto|cmo|chief [a-z]+ officer|president|chair(?:man|woman|person)?|managing director|executive director|director(?: of [a-z ]{2,30})?|general manager|managing partner|senior partner|partner|principal(?: attorney)?|managing attorney|head of [a-z ]{2,30}|vice president|vp of [a-z ]{2,30}|medical director|lead [a-z]+|manager)";
const NAME_RE = /^(?:(?:dr|mr|mrs|ms|prof|barr|engr|hon)\.?\s+)?[A-Z][a-zà-ÿ'’-]+(?:[ \t]+(?:[A-Z]\.|[A-Z][a-zà-ÿ'’-]+)){1,3}$/;
const TITLE_RE = new RegExp(`^(?:the\\s+)?(${TITLE_WORDS}(?:\\s*(?:&|and|,|/|-)\\s*[A-Za-z &]{2,40})?)\\b`, "i");
const INLINE = new RegExp(`^(.{4,60}?)\\s*(?:,|–|—|\\||-|:)\\s*(.{3,80})$`);
const NOT_A_NAME = /^(our|the|about|meet|contact|call|email|read|learn|view|book|get|free|home|services|team|privacy|terms|copyright|all rights|privacy policy|follow us|request|schedule|managing|senior|junior|general|executive|chief|founding|lead|head|vice)\b/i;
const TEAM_PATH = /\/(about|about-us|team|our-team|the-team|meet-the-team|meet-our-team|people|our-people|leadership|management|staff|our-staff|attorneys|our-attorneys|lawyers|partners|doctors|our-doctors|physicians|who-we-are|company|founders?|contact|contact-us|directors|board)(\/|$|\.)/i;

function clean(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;|&rsquo;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
function split(name: string) {
  const parts = name.replace(/^(dr|mr|mrs|ms|miss|prof|barr|engr|chief|hon|sir)\.?\s+/i, "").replace(/,.*$/, "").trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.length > 1 ? parts[parts.length - 1] : "" };
}
const key = (n: string) => n.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

function person(name: string, title: string, source: PersonSource, extra: Partial<Person> = {}): Person {
  const n = clean(name);
  const { first, last } = split(n);
  const t = clean(title);
  const s = seniorityOf(t);
  return {
    name: n, first, last, title: t, seniority: s, decision_maker: isDecisionMaker(s, t), email: "", email_status: "", email_source: "", email_reason: "",
    linkedin: "", phone: "", sources: [source], confidence: source === "website" ? 60 : 70, ...extra,
  };
}

async function get(url: string, ms = 10_000) {
  try {
    const host = new URL(url).hostname;
    if (PRIVATE_HOST.test(host)) return null;
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    return { url: r.url || url, html: (await r.text()).slice(0, 800_000) };
  } catch { return null; }
}

/** Everything the website itself says about its people. */
export async function crawlPeople(website: string, maxPages = 7) {
  const start = /^https?:/i.test(website) ? website : `https://${website}`;
  const home = await get(start);
  const out = { people: [] as Person[], emails: new Set<string>(), pages: [] as string[], domain: "" };
  if (!home) return out;
  const base = new URL(home.url);
  out.domain = siteKey(base.hostname);
  // Pages worth reading: team, about, leadership, contact… on the same site.
  const links = [...home.html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], base).toString(); } catch { return ""; } })
    .filter((u) => u && siteKey(new URL(u).hostname) === out.domain && TEAM_PATH.test(new URL(u).pathname));
  const guesses = ["/about", "/about-us", "/team", "/our-team", "/leadership", "/contact", "/contact-us", "/attorneys", "/people"].map((p) => new URL(p, base).toString());
  const queue = [...new Set([...links.sort((a, b) => score(b) - score(a)), ...guesses])].filter((u) => u !== home.url).slice(0, maxPages + 4);
  const pages = [home];
  for (let i = 0; i < queue.length && pages.length < maxPages + 1; i += 4) {
    const got = await Promise.all(queue.slice(i, i + 4).map((u) => get(u, 8000)));
    for (const g of got) if (g && !pages.some((p) => p.url === g.url)) pages.push(g);
  }
  out.pages = pages.map((p) => p.url);
  for (const p of pages) readPage(p.html, out);
  return out;
}
const score = (u: string) => (/team|leadership|people|attorneys|partners|management|doctors|founder/i.test(u) ? 3 : /about/i.test(u) ? 2 : 1);

function readPage(html: string, out: { people: Person[]; emails: Set<string>; domain: string }) {
  // 1. schema.org Person in JSON-LD
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (x: unknown): void => {
        if (Array.isArray(x)) return x.forEach(walk);
        if (!x || typeof x !== "object") return;
        const o = x as Record<string, unknown>;
        const type = String(o["@type"] ?? "");
        if (/Person/i.test(type) && typeof o.name === "string") {
          const sameAs = ([] as unknown[]).concat(o.sameAs ?? []).map(String);
          out.people.push(person(o.name, String(o.jobTitle ?? ""), "website", {
            email: typeof o.email === "string" ? o.email.replace(/^mailto:/i, "").toLowerCase() : "",
            phone: typeof o.telephone === "string" ? o.telephone : "",
            linkedin: sameAs.find((u) => /linkedin\.com\/in\//i.test(u)) ?? "", confidence: 75,
          }));
        }
        for (const v of Object.values(o)) if (v && typeof v === "object") walk(v);
      };
      walk(JSON.parse(m[1].trim()));
    } catch { /* bad JSON-LD is common */ }
  }

  // Visible text, one block per line, so "Name\nTitle" stays recognisable.
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(h\d|p|div|li|td|tr|figcaption|header|section|article)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;|&rsquo;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t\r]+/g, " ").replace(/ ?\n[ \n]*/g, "\n").trim();

  // 2. Emails: mailto links, plain text, and "name [at] domain [dot] com"
  const found = [
    ...[...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => decodeURIComponent(m[1])),
    ...(text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []),
    ...[...text.matchAll(/([a-z0-9._%+-]+)\s*[\[(]\s*at\s*[\])]\s*([a-z0-9-]+)\s*[\[(]\s*dot\s*[\])]\s*([a-z.]{2,})/gi)].map((m) => `${m[1]}@${m[2]}.${m[3]}`),
  ].map((e) => e.toLowerCase().replace(/[.,;:]+$/, "")).filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !/example\.|sentry|wixpress|godaddy|domain\.com|email\.com|yourdomain/.test(e));
  for (const e of found) out.emails.add(e);

  // 3. LinkedIn profile links with their anchor text
  for (const m of html.matchAll(/<a[^>]+href=["'](https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[^"'?#]+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
    const label = clean(m[2].replace(/<[^>]+>/g, " "));
    if (/^[A-Z][a-z'’-]+(\s+[A-Z][a-z'’-]+){1,3}$/.test(label)) out.people.push(person(label, "", "website", { linkedin: m[1], confidence: 55 }));
    else out.people.push({ ...person("", "", "website"), linkedin: m[1], confidence: 0 });
  }

  // 4. "Jane Doe" with "Founder" on the next line, or "Jane Doe – Founder" on one line
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const isName = (l: string) => NAME_RE.test(l) && !NOT_A_NAME.test(l) && !TITLE_RE.test(l);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (isName(l)) {
      const next = lines[i + 1] ?? "";
      const t = TITLE_RE.exec(next) ? next : (TITLE_RE.exec(lines[i + 2] ?? "") && (lines[i + 1] ?? "").length < 40 ? lines[i + 2] : "");
      if (t) out.people.push(person(l, t.slice(0, 80), "website"));
      continue;
    }
    const m = INLINE.exec(l);
    if (m) {
      const [x, y] = [m[1].trim(), m[2].trim()];
      if (isName(x) && TITLE_RE.test(y)) out.people.push(person(x, y.slice(0, 80), "website"));
      else if (TITLE_RE.test(x) && isName(y)) out.people.push(person(y, x, "website"));
    }
  }
}

/** Common company email formats, in order of how often they're used. */
const PATTERNS = ["{first}", "{first}.{last}", "{f}{last}", "{first}{last}", "{f}.{last}", "{first}_{last}", "{first}{l}", "{last}", "{last}.{first}", "{first}-{last}"];
const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
export function applyPattern(p: string, first: string, last: string, domain: string) {
  const f = slug(first), l = slug(last);
  if (!f || (/\{(last|l)\}/.test(p) && !l)) return "";
  return p.replace("{first}", f).replace("{last}", l).replace("{f}", f[0]).replace("{l}", l[0] ?? "") + "@" + domain;
}
/** Work out the format from addresses we know belong to named people. */
export function inferPattern(known: { first: string; last: string; email: string }[], domain: string) {
  const votes = new Map<string, number>();
  for (const k of known) {
    if (!k.email.endsWith("@" + domain) || ROLE.test(k.email)) continue;
    for (const p of PATTERNS) if (applyPattern(p, k.first, k.last, domain) === k.email) votes.set(p, (votes.get(p) ?? 0) + 1);
  }
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
const hunterPattern = (p?: string | null) => (p ? p.replace("{first_initial}", "{f}").replace("{last_initial}", "{l}") : null);

async function hunter(domain: string) {
  const k = process.env.HUNTER_API_KEY;
  if (!k) return null;
  try {
    const r = await fetch(`${process.env.HUNTER_API_URL ?? "https://api.hunter.io/v2"}/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${encodeURIComponent(k)}`, { signal: AbortSignal.timeout(20_000) });
    const j = (await r.json().catch(() => ({}))) as { data?: { pattern?: string | null; accept_all?: boolean; emails?: { value: string; type: string; confidence?: number; first_name?: string; last_name?: string; position?: string; seniority?: string; linkedin?: string; phone_number?: string; verification?: { status?: string } }[] }; errors?: { details?: string }[] };
    if (!r.ok) return { error: j.errors?.[0]?.details ?? `Hunter said ${r.status}` };
    return { pattern: hunterPattern(j.data?.pattern), accept_all: j.data?.accept_all ?? null, emails: j.data?.emails ?? [] };
  } catch { return { error: "Hunter didn't answer." }; }
}

async function apollo(domain: string) {
  const k = process.env.APOLLO_API_KEY;
  if (!k) return null;
  try {
    const q = new URLSearchParams({ per_page: "10", page: "1" });
    q.append("q_organization_domains_list[]", domain);
    for (const s of ["owner", "founder", "c_suite", "partner", "vp", "head", "director"]) q.append("person_seniorities[]", s);
    const r = await fetch(`${process.env.APOLLO_API_URL ?? "https://api.apollo.io/api/v1"}/mixed_people/api_search?${q}`, {
      method: "POST", headers: { "X-Api-Key": k, "Content-Type": "application/json", "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(20_000),
    });
    const j = (await r.json().catch(() => ({}))) as { people?: { id: string; first_name?: string; last_name?: string; last_name_obfuscated?: string; title?: string; linkedin_url?: string; seniority?: string; has_email?: boolean }[]; error?: string; message?: string };
    if (!r.ok) return { error: j.error ?? j.message ?? `Apollo said ${r.status}` };
    return { people: j.people ?? [] };
  } catch { return { error: "Apollo didn't answer." }; }
}

/** Opt-in, costs an Apollo credit: reveal one person's work email. */
export async function apolloReveal(apolloId: string) {
  const k = process.env.APOLLO_API_KEY;
  if (!k) return null;
  try {
    const r = await fetch(`${process.env.APOLLO_API_URL ?? "https://api.apollo.io/api/v1"}/people/match`, {
      method: "POST", headers: { "X-Api-Key": k, "Content-Type": "application/json" }, body: JSON.stringify({ id: apolloId, reveal_personal_emails: false }), signal: AbortSignal.timeout(20_000),
    });
    const j = (await r.json().catch(() => ({}))) as { person?: { email?: string; email_status?: string; last_name?: string } };
    return j.person ?? null;
  } catch { return null; }
}

/** Merge duplicates (same name, or same email, or same LinkedIn) keeping the richest facts. */
function merge(list: Person[]) {
  const out: Person[] = [];
  for (const p of list.filter((x) => x.name || x.email)) {
    const same = out.find((o) => (p.name && key(o.name) === key(p.name)) || (p.email && o.email === p.email) || (p.linkedin && o.linkedin === p.linkedin));
    if (!same) { out.push({ ...p, sources: [...p.sources] }); continue; }
    if (!same.name && p.name) Object.assign(same, { name: p.name, first: p.first, last: p.last });
    if (p.title && (!same.title || p.title.length > same.title.length)) Object.assign(same, { title: p.title, seniority: p.seniority, decision_maker: p.decision_maker || same.decision_maker });
    for (const f of ["email", "linkedin", "phone"] as const) if (!same[f] && p[f]) same[f] = p[f];
    if (!same.apollo_id && p.apollo_id) same.apollo_id = p.apollo_id;
    if (!same.last && p.last) same.last = p.last;
    if (!same.email_status && p.email_status) Object.assign(same, { email_status: p.email_status, email_source: p.email_source });
    same.sources = [...new Set([...same.sources, ...p.sources])];
    same.confidence = Math.min(100, Math.max(same.confidence, p.confidence) + 10);
  }
  return out;
}

/**
 * The whole waterfall for one business. `verifyBudget` caps how many
 * addresses go to the paid verifier (each one is a credit).
 */
export async function findPeople(co: { name: string; website: string; email?: string }, opts: { verifyBudget?: number; maxPeople?: number } = {}): Promise<PeopleResult> {
  const budget = { left: opts.verifyBudget ?? 6 };
  const res: PeopleResult = { domain: "", people: [], company_emails: [], pattern: null, catch_all: null, pages: [], used: [], notes: [] };
  if (!co.website && !co.email) { res.notes.push("No website or email to start from."); return res; }

  const site = co.website ? await crawlPeople(co.website) : null;
  res.domain = site?.domain || (co.email?.split("@")[1] ? siteKey(co.email.split("@")[1]) : "");
  if (!res.domain) { res.notes.push("The website didn't load, so there was nothing to read."); return res; }
  if (site?.pages.length) { res.used.push(`website (${site.pages.length} page${site.pages.length === 1 ? "" : "s"})`); res.pages = site.pages; }
  let people = site?.people ?? [];
  const emails = new Set([...(site?.emails ?? []), ...(co.email ? [co.email.toLowerCase()] : [])]);

  const h = await hunter(res.domain);
  if (h && "error" in h) res.notes.push(`Hunter: ${h.error}`);
  else if (h) {
    res.used.push("Hunter");
    if (h.pattern) res.pattern = h.pattern;
    if (h.accept_all != null) res.catch_all = h.accept_all;
    for (const e of h.emails) {
      emails.add(e.value.toLowerCase());
      if (e.type === "personal" && e.first_name) {
        const v = e.verification?.status;
        people.push(person(`${e.first_name} ${e.last_name ?? ""}`, e.position ?? "", "hunter", {
          email: e.value.toLowerCase(), email_source: "hunter", email_status: v === "valid" ? "valid" : v === "invalid" ? "invalid" : v === "accept_all" ? "catch_all" : "",
          linkedin: e.linkedin ?? "", phone: e.phone_number ?? "", confidence: Math.min(95, e.confidence ?? 70),
        }));
      }
    }
  }

  const a = await apollo(res.domain);
  if (a && "error" in a) res.notes.push(`Apollo: ${a.error}`);
  else if (a) {
    res.used.push("Apollo");
    for (const x of a.people) {
      const last = x.last_name ?? "";
      people.push(person(`${x.first_name ?? ""} ${last || (x.last_name_obfuscated ?? "").replace(/\*+/g, "")}`.trim(), x.title ?? "", "apollo", {
        last, linkedin: x.linkedin_url ?? "", confidence: 75, apollo_id: x.has_email ? x.id : undefined,
      }));
    }
  }

  // Emails on their own domain that carry a name: attach to the person.
  const domainEmails = [...emails].filter((e) => e.endsWith("@" + res.domain) || co.email?.toLowerCase() === e);
  people = merge(people);
  for (const p of people) {
    if (p.email || !p.first) continue;
    const hit = domainEmails.find((e) => !ROLE.test(e) && PATTERNS.some((pat) => applyPattern(pat, p.first, p.last, res.domain) === e));
    if (hit) Object.assign(p, { email: hit, email_source: "website" });
  }
  for (const p of people) if (p.email && !p.email_source) p.email_source = p.sources[0];
  res.company_emails = domainEmails.filter((e) => ROLE.test(e) || !people.some((p) => p.email === e)).slice(0, 5);

  // The company's email format, from people whose address we know.
  res.pattern = inferPattern(people.filter((p) => p.email && p.last), res.domain) ?? res.pattern;

  // Keep real people, most senior first.
  people = people.filter((p) => p.name && p.first && (p.title || p.email || p.linkedin))
    .sort((x, y) => Number(y.decision_maker) - Number(x.decision_maker) || rankOf(x.seniority) - rankOf(y.seniority) || y.confidence - x.confidence)
    .slice(0, opts.maxPeople ?? 8);

  // Decision makers without an email: try the pattern, then the common ones, verifying as we go.
  for (const p of people.filter((x) => x.decision_maker && !x.email).slice(0, 3)) {
    const order: string[] = [...new Set([res.pattern, ...PATTERNS].filter((x): x is string => !!x))];
    for (const pat of order.slice(0, res.pattern ? 2 : 4) as string[]) {
      const guess = applyPattern(pat, p.first, p.last, res.domain);
      if (!guess) continue;
      if (budget.left <= 0) { if (res.pattern === pat) Object.assign(p, { email: guess, email_source: "pattern", email_status: "unknown", email_reason: "Guessed from the company's email format; not verified yet." }); break; }
      budget.left--;
      const v = await verifyEmail(guess);
      if (v.status === "valid") { Object.assign(p, { email: guess, email_source: "pattern", email_status: "valid", email_reason: "Guessed from the format and verified.", confidence: Math.max(p.confidence, 80) }); break; }
      if (v.status === "catch_all") {
        res.catch_all = true;
        Object.assign(p, { email: applyPattern(res.pattern ?? "{first}", p.first, p.last, res.domain) || guess, email_source: "pattern", email_status: "catch_all", email_reason: "The domain accepts every address, so this best guess can't be confirmed." });
        break;
      }
      if (v.status === "unknown" && v.provider === "free") { // no paid verifier: keep the likeliest guess, unverified
        if (res.pattern === pat || !res.pattern) Object.assign(p, { email: guess, email_source: "pattern", email_status: "unknown", email_reason: "Guessed from common formats; add a verifier key to confirm it." });
        break;
      }
    }
  }
  // Verify found addresses we haven't checked.
  for (const p of people.filter((x) => x.email && !x.email_status)) {
    if (budget.left <= 0) break;
    budget.left--;
    const v = await verifyEmail(p.email);
    Object.assign(p, { email_status: v.status, email_reason: v.reason });
  }
  res.people = people;
  if (!people.length) res.notes.push(site?.pages.length ? "No names on the website. Their LinkedIn company page is the next place to look." : "Couldn't read the website.");
  return res;
}
