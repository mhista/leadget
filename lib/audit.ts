import "server-only";
import { lookup } from "node:dns/promises";
import type { Audit, AuditIssue, SiteState } from "@/lib/types";

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

/** example.co.uk / shop.example.com → example.co.uk / example.com, so "www." and subdomains don't count as moving. */
export function siteKey(hostOrUrl: string) {
  let h = hostOrUrl.toLowerCase();
  try { if (/^https?:/i.test(h)) h = new URL(h).hostname; } catch { /* keep as is */ }
  const parts = h.replace(/^www\./, "").replace(/\.$/, "").split(".");
  const second = parts.at(-2) ?? "";
  const n = parts.length > 2 && (/^(com|co|org|net|gov|edu|ac|ltd|plc|sch|mil|nom|biz)$/.test(second) || second.length <= 2 && parts.at(-1)!.length === 2) ? 3 : 2;
  return parts.slice(-n).join(".");
}

/** Hosts that mean "they have no real website": socials, link pages, map listings. */
export const SOCIAL_HOSTS = /(^|\.)(facebook|fb|instagram|linktr|linkin\.bio|beacons|wa|whatsapp|tiktok|twitter|x|linkedin|youtube|google|business\.site|g\.page|maps\.app\.goo|bit|t)\.(com|me|ee|ly|gl|co|page|site|bio|ai)$/i;

const PARKED: [RegExp, SiteState, string][] = [
  [/(this domain|the domain)[^.<]{0,40}(is |may be )?for sale|buy this domain|make an offer on this domain|hugedomains|afternic|dan\.com\/|sedo\.com|undeveloped\.com|atom\.com\/name/i, "for_sale", "The domain is listed for sale"],
  [/domain (has )?expired|expired domain|renew (this|your) domain|this domain name has expired/i, "expired", "The domain has expired"],
  [/parkingcrew|sedoparking|bodis\.com|parked free|domain parking|this domain (is )?parked|parkingpage|above\.com|domaincntrol|park\.godaddy|is parked by/i, "parked", "The domain shows a parking page"],
  [/account (has been )?suspended|this account has been suspended|website (is )?suspended|bandwidth limit exceeded|hosting (account )?(expired|suspended)/i, "suspended", "The hosting account is suspended"],
  [/coming soon|under construction|site is being built|launching soon|default web site page|welcome to nginx|apache2? (ubuntu )?default page|it works!|index of \/|future home of|website coming soon/i, "placeholder", "The site shows a placeholder page"],
];

const MOVED_TEXT = /(we(?:'|’| ha)ve moved|we have a new (?:website|site|home)|visit our new (?:website|site)|has moved to|our new (?:website|site|address) is|moved to (?:our new|a new))/i;

const GENERIC = new Set(["the", "and", "ltd", "limited", "plc", "inc", "llc", "company", "co", "services", "service", "group", "global", "nigeria", "international", "enterprises", "ventures", "solutions", "store", "shop", "clinic", "pharmacy", "hotel", "restaurant", "lounge", "academy", "school", "church", "centre", "center", "studio", "salon", "law", "firm", "associates", "partners", "agency", "real", "estate", "properties"]);
/** Distinctive words of a business name, for "does this page mention them?". */
export function nameTokens(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s&]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !GENERIC.has(w));
}

async function get(url: string, ms: number) {
  return fetch(url, { redirect: "manual", headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(ms) });
}

/** Follow redirects by hand so every hop is recorded (fetch's own "follow" hides them). */
async function follow(start: string, ms: number) {
  const hops: string[] = [start];
  let url = start;
  for (let i = 0; i < 8; i++) {
    const res = await get(url, ms);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      let next: string;
      try { next = new URL(loc, url).toString(); } catch { return { res, url, hops }; }
      const h = new URL(next).hostname;
      if (PRIVATE_HOST.test(h) || hops.includes(next)) return { res, url, hops };
      hops.push(next); url = next; continue;
    }
    return { res, url, hops };
  }
  throw new Error("Too many redirects");
}

export async function auditWebsite(input: string, opts: { name?: string } = {}): Promise<Audit> {
  const url = /^https?:\/\//i.test(input) ? input.trim() : `https://${input.trim()}`;
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
    base.site_state = "error";
    base.issues.push({ id: "bad-url", severity: "high", title: "Not a public web address", pitch: "The address on file doesn't lead to a public website." });
    base.opportunity = 80;
    return base;
  }

  // A domain that no longer resolves is gone (expired or deleted), not "slow".
  try { await lookup(host); } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      base.site_state = "no_dns";
      base.issues.push({ id: "no-dns", severity: "high", title: "The domain doesn't exist any more", pitch: `${host} no longer points anywhere, so the old website is gone. They may have let it lapse or moved to a new address.` });
      base.opportunity = 95;
      return base;
    }
  }

  const started = Date.now();
  let res: Response | null = null;
  let html = "";
  let hops: string[] = [url];
  let at = url;
  try {
    ({ res, url: at, hops } = await follow(url, 12_000));
    html = (await res.text()).slice(0, 1_500_000);
  } catch {
    // https failed? try plain http once — plenty of small-business sites have no certificate.
    if (url.startsWith("https://")) {
      try {
        ({ res, url: at, hops } = await follow(url.replace(/^https:/, "http:"), 10_000));
        html = (await res.text()).slice(0, 1_500_000);
      } catch { res = null; }
    }
  }
  const ms = Date.now() - started;

  if (!res) {
    base.load_ms = ms;
    base.site_state = "down";
    base.issues.push({
      id: "down", severity: "high", title: "Website doesn't load",
      pitch: "When I tried to visit your website it didn't load — anyone who finds you on Google right now hits a dead end.",
    });
    base.opportunity = 95;
    return base;
  }

  const final = at;
  const a: Audit = {
    ...base,
    redirects: hops.length > 1 ? hops : undefined,
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
  // Numbers written out on the page (not just tel: links): +234 801 234 5678, 0801-234-5678, (020) 7946 0958…
  const plain = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  for (const m of plain.matchAll(/(?<![\w.])(\+\d{1,3}[\s.-]?|0)\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?![\w])/g)) {
    const d = m[0].replace(/\D/g, "");
    if (d.length >= 10 && d.length <= 13 && phones.size < 6) phones.add(m[0].trim());
  }
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

  // Where does this business live now?
  const canon = pick(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ?? pick(html, /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
  if (canon && /^https?:/i.test(canon) && !/staging|\bdev\b|localhost|wpengine|vercel\.app|netlify|herokuapp|wixsite|myshopify|github\.io|webflow\.io/i.test(canon)) a.canonical = canon;
  const meta = pick(html, /<meta[^>]+http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>\s]+)/i);
  const js = html.length < 20_000 ? pick(html, /(?:window\.)?location(?:\.href)?\s*(?:=|\.replace\(|\.assign\()\s*["'](https?:\/\/[^"']+)["']/i) : undefined;
  let movedText: string | undefined;
  const mt = MOVED_TEXT.exec(html.replace(/<[^>]+>/g, " "));
  if (mt) {
    const tail = html.slice(Math.max(0, html.search(MOVED_TEXT) - 200), html.search(MOVED_TEXT) + 600);
    movedText = [...tail.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]).find((u) => siteKey(u) !== siteKey(host));
  }
  const elsewhere = [final, meta, js, movedText, a.canonical].filter((u): u is string => !!u && /^https?:/i.test(u))
    .find((u) => { try { return siteKey(new URL(u).hostname) !== siteKey(host); } catch { return false; } });
  const lower = html.toLowerCase();
  const parked = a.reachable ? PARKED.find(([re]) => re.test(lower.slice(0, 200_000))) : undefined;
  if (elsewhere) {
    a.moved_to = elsewhere;
    a.site_state = SOCIAL_HOSTS.test(new URL(elsewhere).hostname) ? "social_only" : "moved";
  } else if (parked && (html.length < 120_000 || parked[1] !== "placeholder")) {
    a.site_state = parked[1];
  } else if (!a.reachable) {
    a.site_state = "error";
  } else {
    a.site_state = "ok";
  }
  if (opts.name && a.reachable && a.site_state === "ok") {
    const text = decode(lower.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")) ?? "";
    const tokens = nameTokens(opts.name);
    a.name_match = !tokens.length || tokens.some((t) => text.includes(t));
    if (!a.name_match && text.length > 400) a.site_state = "mismatch";
  }

  a.issues = findIssues(a, html);
  a.opportunity = Math.min(100, a.issues.reduce((n, i) => n + (i.severity === "high" ? 28 : i.severity === "medium" ? 14 : 6), 0));
  return a;
}

const hostOf = (u?: string) => { try { return new URL(u ?? "").hostname.replace(/^www\./, ""); } catch { return "another address"; } };

function findIssues(a: Audit, html: string): AuditIssue[] {
  const out: AuditIssue[] = [];
  const year = new Date().getFullYear();

  if (!a.reachable) {
    out.push({ id: "status", severity: "high", title: `Site returns an error (${a.status})`, pitch: `Your website is returning an error page (${a.status}) right now, so visitors can't see anything.` });
    return out;
  }
  const st = a.site_state;
  if (st === "moved") out.push({ id: "moved", severity: "medium", title: `Old address forwards to ${hostOf(a.moved_to)}`, pitch: `Your old address now forwards to ${hostOf(a.moved_to)}; links and listings that still use the old one depend on that forward staying up.` });
  if (st === "social_only") out.push({ id: "social-only", severity: "high", title: `Website now just forwards to ${hostOf(a.moved_to)}`, pitch: "Your web address just sends people to a social page, so there's nowhere you control that shows what you do, your prices or how to book." });
  if (st === "for_sale" || st === "expired" || st === "parked") out.push({ id: "parked", severity: "high", title: st === "for_sale" ? "Domain is up for sale" : st === "expired" ? "Domain has expired" : "Domain shows a parking page", pitch: "Your domain shows a holding page instead of your business, so anyone who looks you up gets nothing — and someone else could buy it." });
  if (st === "suspended") out.push({ id: "suspended", severity: "high", title: "Hosting suspended", pitch: "Your website shows a “suspended” notice, so visitors think you've closed." });
  if (st === "placeholder") out.push({ id: "placeholder", severity: "high", title: "Placeholder page", pitch: "Your domain shows a placeholder page, so anyone who looks you up doesn't see your business." });
  if (st === "mismatch") out.push({ id: "mismatch", severity: "medium", title: "Page doesn't mention this business", pitch: "The site at this address doesn't mention the business at all; it may belong to someone else now, or the listing is wrong." });
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
