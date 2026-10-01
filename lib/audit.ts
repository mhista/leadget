import "server-only";
import type { Audit, AuditIssue } from "@/lib/types";

/**
 * Website audit.
 *
 * Fetches the homepage once and reads it the way a prospective customer would:
 * does it load, is it secure, does it work on a phone, can I contact them,
 * does it look maintained. Every finding becomes an issue with a line you can
 * say to the owner — "customers on phones see a desktop page shrunk to fit"
 * lands; "missing viewport meta" does not.
 *
 * One request, no crawling, a normal browser user-agent, 12s ceiling.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|\[?::1\]?$)/i;

const PLATFORMS: [RegExp, string][] = [
  [/wp-content|wp-includes|wordpress/i, "WordPress"],
  [/static\.wixstatic\.com|wix\.com/i, "Wix"],
  [/squarespace/i, "Squarespace"],
  [/cdn\.shopify\.com|shopify/i, "Shopify"],
  [/webflow/i, "Webflow"],
  [/godaddy|img1\.wsimg\.com/i, "GoDaddy Builder"],
  [/__next|_next\/static/i, "Next.js"],
  [/joomla/i, "Joomla"],
  [/blogspot|blogger\.com/i, "Blogger"],
  [/weebly/i, "Weebly"],
  [/framer\.com|framerusercontent/i, "Framer"],
];

const SOCIALS: [RegExp, string][] = [
  [/https?:\/\/(www\.)?facebook\.com\/[^"'\s<>]+/gi, "Facebook"],
  [/https?:\/\/(www\.)?instagram\.com\/[^"'\s<>]+/gi, "Instagram"],
  [/https?:\/\/(www\.)?(twitter|x)\.com\/[^"'\s<>]+/gi, "X"],
  [/https?:\/\/(www\.|[a-z]{2}\.)?linkedin\.com\/(company|in)\/[^"'\s<>]+/gi, "LinkedIn"],
  [/https?:\/\/(www\.)?tiktok\.com\/@[^"'\s<>]+/gi, "TikTok"],
  [/https?:\/\/(www\.)?youtube\.com\/[^"'\s<>]+/gi, "YouTube"],
];

const pick = (html: string, re: RegExp) => html.match(re)?.[1]?.replace(/\s+/g, " ").trim();

function decode(s?: string) {
  return s
    ?.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8211;|&ndash;/g, "–").replace(/&#8217;/g, "’");
}

const BAD_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|example\.|sentry|wixpress|@2x|domain\.com|email\.com|yourname/i;

export async function auditWebsite(input: string): Promise<Audit> {
  const url = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const base: Audit = {
    checked_at: new Date().toISOString(),
    url,
    reachable: false,
    https: url.startsWith("https://"),
    mobile_ready: false,
    has_analytics: false,
    has_contact_form: false,
    has_booking: false,
    has_whatsapp: false,
    emails: [],
    phones: [],
    socials: [],
    issues: [],
    opportunity: 0,
  };

  let host = "";
  try { host = new URL(url).hostname; } catch { /* handled below */ }
  if (!host || PRIVATE_HOST.test(host)) {
    base.issues.push({ id: "bad-url", severity: "high", title: "Not a public web address", pitch: "The address on file doesn't lead to a public website." });
    base.opportunity = 80;
    return base;
  }

  const started = Date.now();
  let res: Response | null = null;
  let html = "";
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12_000),
    });
    html = (await res.text()).slice(0, 1_500_000);
  } catch {
    // https failed? try plain http once — plenty of small-business sites have no certificate.
    if (url.startsWith("https://")) {
      try {
        const httpUrl = url.replace(/^https:/, "http:");
        res = await fetch(httpUrl, { redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
        html = (await res.text()).slice(0, 1_500_000);
      } catch { res = null; }
    }
  }
  const ms = Date.now() - started;

  if (!res) {
    base.load_ms = ms;
    base.issues.push({
      id: "down", severity: "high", title: "Website doesn't load",
      pitch: "When I tried to visit your website it didn't load — anyone who finds you on Google right now hits a dead end.",
    });
    base.opportunity = 95;
    return base;
  }

  const final = res.url || url;
  const a: Audit = {
    ...base,
    reachable: res.ok,
    status: res.status,
    final_url: final,
    load_ms: ms,
    https: final.startsWith("https://"),
    page_kb: Math.round(html.length / 1024),
    title: decode(pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i)),
    description: decode(
      pick(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
      pick(html, /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i),
    ),
    mobile_ready: /<meta[^>]+name=["']viewport["'][^>]*width=device-width/i.test(html),
    has_analytics: /googletagmanager|google-analytics|gtag\(|fbq\(|plausible|clarity\.ms|hotjar/i.test(html),
    has_contact_form: /<form[\s\S]{0,4000}?(type=["']email["']|name=["'][^"']*(email|message|phone)[^"']*["'])/i.test(html),
    has_booking: /calendly|book(ing)?[\s-]?(now|online|appointment)|schedule an appointment|acuityscheduling|setmore|booksy|fresha|opentable|reserve a table/i.test(html),
    has_whatsapp: /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(html),
  };

  for (const [re, name] of PLATFORMS) if (re.test(html)) { a.platform = name; break; }

  const years = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map((m) => +m[1]).filter((y) => y > 1995 && y < 2100);
  if (years.length) a.copyright_year = Math.max(...years);

  const emails = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?\s<>]+)/gi)) emails.add(decodeURIComponent(m[1]).toLowerCase());
  for (const m of html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) emails.add(m[0].toLowerCase());
  a.emails = [...emails].filter((e) => !BAD_EMAIL.test(e)).slice(0, 6);

  const phones = new Set<string>();
  for (const m of html.matchAll(/tel:([+\d\s().-]{7,20})/gi)) phones.add(m[1].trim());
  a.phones = [...phones].slice(0, 4);

  const seen = new Set<string>();
  for (const [re, network] of SOCIALS) {
    for (const m of html.matchAll(re)) {
      const u = m[0].replace(/["'<>].*$/, "").replace(/\/$/, "");
      if (/sharer|share\?|intent\/|plugins|dialog|\/tr\?|\.php/i.test(u) || seen.has(network)) continue;
      seen.add(network);
      a.socials.push({ network, url: u });
    }
  }

  a.issues = findIssues(a, html);
  a.opportunity = Math.min(100, a.issues.reduce((n, i) => n + (i.severity === "high" ? 28 : i.severity === "medium" ? 14 : 6), 0));
  return a;
}

function findIssues(a: Audit, html: string): AuditIssue[] {
  const out: AuditIssue[] = [];
  const year = new Date().getFullYear();

  if (!a.reachable) {
    out.push({ id: "status", severity: "high", title: `Site returns an error (${a.status})`, pitch: `Your website is returning an error page (${a.status}) right now, so visitors can't see anything.` });
    return out;
  }
  if (/domain (is )?(for sale|parked)|this domain may be for sale|parkingcrew|sedoparking|coming soon|under construction/i.test(html)) {
    out.push({ id: "parked", severity: "high", title: "Placeholder or parked page", pitch: "Your domain shows a placeholder page, so anyone who looks you up doesn't see your business." });
  }
  if (!a.https) out.push({ id: "https", severity: "high", title: "No HTTPS", pitch: "Browsers mark your site as “Not secure”, which makes visitors hesitate before they contact you." });
  if (!a.mobile_ready) out.push({ id: "mobile", severity: "high", title: "Not built for phones", pitch: "On a phone your site shows the desktop page shrunk down — and most of your visitors are on phones." });
  if ((a.load_ms ?? 0) > 4500) out.push({ id: "slow", severity: "medium", title: `Slow to load (${((a.load_ms ?? 0) / 1000).toFixed(1)}s)`, pitch: `The homepage took about ${Math.round((a.load_ms ?? 0) / 1000)} seconds to load for me; people usually leave after three.` });
  if (a.copyright_year && a.copyright_year < year - 1) out.push({ id: "stale", severity: "medium", title: `Looks unmaintained (© ${a.copyright_year})`, pitch: `The footer still says ${a.copyright_year}, which makes it look like the site isn't looked after.` });
  if (!a.title || a.title.length < 8) out.push({ id: "title", severity: "medium", title: "Missing page title", pitch: "Your homepage has no proper title, so Google shows a weak listing for you." });
  if (!a.description) out.push({ id: "meta", severity: "low", title: "No search description", pitch: "There's no description set for Google, so it guesses what to show under your name." });
  if (!a.has_contact_form && !a.has_whatsapp && !a.has_booking) out.push({ id: "capture", severity: "medium", title: "No way to enquire on the page", pitch: "There's no form, booking button or WhatsApp link on the homepage, so interested visitors have to go and find a way to reach you." });
  if (!a.has_analytics) out.push({ id: "analytics", severity: "low", title: "No analytics", pitch: "There's no analytics installed, so there's no way to know how many people visit or where they come from." });
  if (a.platform && ["Wix", "Weebly", "Blogger", "GoDaddy Builder", "Joomla"].includes(a.platform)) out.push({ id: "platform", severity: "low", title: `Built on ${a.platform}`, pitch: `The site is on ${a.platform}, which limits speed, search ranking and what you can add later.` });
  if (!a.socials.length) out.push({ id: "social", severity: "low", title: "No social links", pitch: "The site doesn't link to any social profiles, which is where a lot of people check a business out first." });
  if ((a.page_kb ?? 0) > 900) out.push({ id: "heavy", severity: "low", title: `Heavy page (${a.page_kb} KB of HTML)`, pitch: "The page is very heavy, which makes it slow on mobile data." });

  return out;
}
