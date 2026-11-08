import "server-only";
import { connect } from "node:tls";
import { lookup, resolveMx, resolveTxt } from "node:dns/promises";
import { PRIVATE_HOST, UA, siteKey } from "@/lib/audit";
import type { AuditIssue, SiteHealth } from "@/lib/types";

/**
 * A website's technical health, the way httpstatus.io and a careful buyer
 * would see it: every redirect hop with its status code, whether a "403" is
 * a firewall (site fine) or a real error, the TLS certificate and its
 * expiry, http → https, robots.txt and sitemap, broken links on the
 * homepage, a page that should 404 but doesn't, security headers, mixed
 * content, and whether their domain is set up to send email (MX, SPF,
 * DMARC: without these their own emails land in spam).
 */

const BLOCK = /cloudflare|just a moment|attention required|captcha|access denied|request blocked|sucuri|incapsula|akamai|ddos-guard|bot protection/i;
type Hop = { url: string; status: number };

async function hop(url: string, ms = 10_000, method = "GET") {
  return fetch(url, { method, redirect: "manual", headers: { "User-Agent": UA, Accept: "text/html,*/*" }, signal: AbortSignal.timeout(ms) });
}

async function chain(start: string) {
  const hops: Hop[] = [];
  let url = start, res: Response | null = null, ttfb: number | null = null;
  for (let i = 0; i < 10; i++) {
    const t = Date.now();
    res = await hop(url);
    if (ttfb === null) ttfb = Date.now() - t;
    hops.push({ url, status: res.status });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, url).toString();
      if (PRIVATE_HOST.test(new URL(next).hostname) || hops.some((h) => h.url === next)) break;
      url = next; continue;
    }
    break;
  }
  return { hops, res, final: url, ttfb };
}

function cert(host: string): Promise<SiteHealth["tls"]> {
  return new Promise((resolve) => {
    const s = connect({ host, port: 443, servername: host, timeout: 8000, rejectUnauthorized: false }, () => {
      const c = s.getPeerCertificate();
      const days = c?.valid_to ? Math.floor((new Date(c.valid_to).getTime() - Date.now()) / 86400_000) : null;
      const issuer = (c?.issuer?.O as string | undefined) ?? (c?.issuer?.CN as string | undefined) ?? "";
      resolve({ valid: s.authorized && (days ?? 0) > 0, days_left: days, issuer });
      s.end();
    });
    s.on("error", () => resolve(null));
    s.on("timeout", () => { s.destroy(); resolve(null); });
  });
}

async function txt(name: string) {
  try { return (await resolveTxt(name)).map((r) => r.join("")); } catch { return []; }
}

export async function siteHealth(input: string): Promise<SiteHealth> {
  const start = /^https?:\/\//i.test(input) ? input.trim() : `https://${input.trim()}`;
  const host = new URL(start).hostname;
  const h: SiteHealth = {
    checked_at: new Date().toISOString(), score: 0, verdict: "healthy", label: "", status: null, hops: [], ttfb_ms: null, https_redirect: null, tls: null,
    robots: null, sitemap: null, soft_404: null, headers: null, links_checked: 0, broken_links: [], mixed_content: 0, email: null, issues: [],
  };
  const issue = (i: AuditIssue) => h.issues.push(i);
  const domain = siteKey(host);

  // Email DNS runs regardless: even a dead site's domain may send their email.
  const [mx, spf, dmarc] = await Promise.all([
    resolveMx(domain).then((r) => r.length > 0).catch(() => false),
    txt(domain).then((r) => r.some((t) => /^v=spf1/i.test(t))),
    txt(`_dmarc.${domain}`).then((r) => r.some((t) => /^v=DMARC1/i.test(t))),
  ]);
  h.email = { mx, spf, dmarc };

  try { await lookup(host); } catch {
    Object.assign(h, { verdict: "dns_failed", label: "Error: server offline or DNS failed", score: 0 });
    issue({ id: "dns", severity: "high", title: "Domain doesn't resolve", pitch: `${host} doesn't point anywhere right now, so the site is unreachable for everyone.` });
    return h;
  }

  let c: Awaited<ReturnType<typeof chain>>;
  try { c = await chain(start); } catch {
    try { c = await chain(start.replace(/^https:/, "http:")); } catch {
      Object.assign(h, { verdict: "offline", label: "Error: server offline or not answering", score: 5 });
      issue({ id: "offline", severity: "high", title: "Server doesn't answer", pitch: "Your website's server didn't answer at all when I tried it." });
      return h;
    }
  }
  h.hops = c.hops; h.ttfb_ms = c.ttfb;
  const res = c.res!;
  h.status = res.status;
  const body = res.status < 300 || res.status >= 400 ? (await res.text().catch(() => "")).slice(0, 600_000) : "";
  const codes = c.hops.map((x) => x.status).join(" → ");
  if (res.status >= 200 && res.status < 300) {
    h.verdict = c.hops.length > 1 ? "redirects" : "healthy";
    h.label = c.hops.length > 1 ? `Healthy: redirects (${codes})` : "Healthy: direct access";
  } else if ([401, 403, 429, 503].includes(res.status) && BLOCK.test(body.slice(0, 40_000) + (res.headers.get("server") ?? ""))) {
    h.verdict = "blocked"; h.label = `Warning: access restricted by a firewall (${res.status})`;
  } else if (res.status === 410) { h.verdict = "gone"; h.label = "Error: permanently removed (410)"; }
  else if (res.status >= 500) { h.verdict = "server_error"; h.label = `Error: server error (${res.status})`; }
  else { h.verdict = res.status === 403 ? "blocked" : "broken"; h.label = res.status === 403 ? "Warning: access restricted (403)" : `Error: page or domain broken or missing (${res.status})`; }
  if (c.hops.length > 2) issue({ id: "redirect-chain", severity: "low", title: `${c.hops.length - 1} redirects before the page`, pitch: `Your address bounces through ${c.hops.length - 1} redirects (${codes}) before the page loads, which slows the first visit and dilutes search ranking.` });
  if (h.verdict === "broken" || h.verdict === "gone" || h.verdict === "server_error") issue({ id: "status", severity: "high", title: h.label.replace(/^Error: /, ""), pitch: `Your homepage returns ${res.status} right now, so visitors see an error instead of your business.` });

  const final = new URL(c.final);
  const okPage = res.status >= 200 && res.status < 300;
  const checks: Promise<unknown>[] = [];

  // TLS certificate.
  checks.push(cert(final.hostname).then((t) => {
    h.tls = t;
    if (!t) issue({ id: "tls", severity: "high", title: "No working HTTPS certificate", pitch: "Your site has no working security certificate, so browsers warn visitors before showing it." });
    else if (!t.valid) issue({ id: "tls", severity: "high", title: (t.days_left ?? 0) <= 0 ? "Security certificate has expired" : "Security certificate isn't trusted", pitch: "Browsers show a security warning on your site, which stops most people from going any further." });
    else if ((t.days_left ?? 99) < 14) issue({ id: "tls-expiring", severity: "medium", title: `Certificate expires in ${t.days_left} days`, pitch: `Your site's security certificate runs out in ${t.days_left} days; if it isn't renewed, visitors get a full-page warning.` });
  }));
  // http:// should forward to https://
  checks.push(hop(`http://${host}/`, 8000).then((r) => {
    const loc = r.headers.get("location") ?? "";
    h.https_redirect = r.status >= 300 && r.status < 400 && /^https:/i.test(new URL(loc || "/", `http://${host}/`).toString());
    if (!h.https_redirect && r.status < 400) issue({ id: "http", severity: "medium", title: "http:// doesn't redirect to https://", pitch: "Typing your address without https still opens an unsecured version of the site, marked “Not secure”." });
  }).catch(() => { h.https_redirect = null; }));
  // robots.txt, sitemap.xml and a page that shouldn't exist.
  checks.push(hop(new URL("/robots.txt", final).toString(), 6000).then((r) => { h.robots = r.status === 200; }).catch(() => {}));
  checks.push(hop(new URL("/sitemap.xml", final).toString(), 6000).then((r) => { h.sitemap = r.status === 200 || (r.status >= 300 && r.status < 400); }).catch(() => {}));
  checks.push(hop(new URL(`/kymaa-check-${Date.now().toString(36)}`, final).toString(), 6000).then((r) => { h.soft_404 = r.status === 200; }).catch(() => {}));
  await Promise.all(checks);
  if (okPage && h.sitemap === false) issue({ id: "sitemap", severity: "low", title: "No sitemap", pitch: "There's no sitemap, so Google has to find your pages by chance; new pages show up in search slower." });
  if (okPage && h.soft_404) issue({ id: "soft404", severity: "low", title: "Missing pages return 200", pitch: "Pages that don't exist still load as normal pages instead of a 404, which confuses Google and visitors." });

  if (okPage) {
    const hd = res.headers;
    h.headers = {
      hsts: !!hd.get("strict-transport-security"), csp: !!hd.get("content-security-policy"), nosniff: /nosniff/i.test(hd.get("x-content-type-options") ?? ""),
      frame: !!hd.get("x-frame-options") || /frame-ancestors/i.test(hd.get("content-security-policy") ?? ""), referrer: !!hd.get("referrer-policy"),
    };
    const missing = Object.entries(h.headers).filter(([, v]) => !v).length;
    if (missing >= 4) issue({ id: "headers", severity: "low", title: `${missing} of 5 security headers missing`, pitch: "The site is missing the basic security headers that stop it being embedded or tampered with; it's a quick fix that also helps trust scores." });
    if (final.protocol === "https:") {
      h.mixed_content = (body.match(/(?:src|href)=["']http:\/\/(?!localhost)[^"']+\.(?:js|css|png|jpe?g|gif|webp|svg|woff2?)/gi) ?? []).length;
      if (h.mixed_content) issue({ id: "mixed", severity: "medium", title: `${h.mixed_content} insecure file${h.mixed_content === 1 ? "" : "s"} on a secure page`, pitch: "Some images or scripts still load over plain http, so browsers drop the padlock or block them." });
    }
    // Broken links on the homepage: same-site pages and images, up to 25.
    const links = [...new Set([...body.matchAll(/(?:href|src)=["']([^"'#?]+)["']/gi)].map((m) => { try { return new URL(m[1], final).toString(); } catch { return ""; } }))]
      .filter((u) => u.startsWith("http") && siteKey(new URL(u).hostname) === domain && !/\.(css|js|woff2?|ico)$|wp-json|xmlrpc|\/feed\/?$|mailto:|tel:/i.test(u) && u !== c.final)
      .slice(0, 25);
    h.links_checked = links.length;
    for (let i = 0; i < links.length; i += 6) {
      await Promise.all(links.slice(i, i + 6).map(async (u) => {
        try {
          let r = await hop(u, 7000, "HEAD");
          if (r.status === 405 || r.status === 501) r = await hop(u, 7000);
          if (r.status >= 400 && r.status !== 403 && r.status !== 429) h.broken_links.push({ url: u, status: r.status });
        } catch { h.broken_links.push({ url: u, status: "no answer" }); }
      }));
    }
    if (h.broken_links.length) issue({ id: "broken-links", severity: h.broken_links.length > 2 ? "medium" : "low", title: `${h.broken_links.length} broken link${h.broken_links.length === 1 ? "" : "s"} on the homepage`, pitch: `${h.broken_links.length} link${h.broken_links.length === 1 ? "" : "s"} on your homepage lead${h.broken_links.length === 1 ? "s" : ""} to a dead page, which looks neglected to visitors and to Google.` });
    if ((h.ttfb_ms ?? 0) > 1500) issue({ id: "ttfb", severity: "medium", title: `Server is slow to respond (${((h.ttfb_ms ?? 0) / 1000).toFixed(1)}s)`, pitch: `Your server takes ${((h.ttfb_ms ?? 0) / 1000).toFixed(1)} seconds just to start sending the page, before anything loads.` });
  }
  if (mx && (!spf || !dmarc)) issue({ id: "email-auth", severity: "medium", title: `Email not authenticated (${[!spf && "no SPF", !dmarc && "no DMARC"].filter(Boolean).join(", ")})`, pitch: `Your domain is missing ${[!spf && "SPF", !dmarc && "DMARC"].filter(Boolean).join(" and ")}, so emails you send to clients are more likely to land in spam.` });

  // Score: start from 100 and take off for what a visitor or Google would notice.
  const weight = { high: 25, medium: 10, low: 4 } as const;
  const base = h.verdict === "healthy" || h.verdict === "redirects" ? 100 : h.verdict === "blocked" ? 75 : 20;
  h.score = Math.max(0, Math.min(100, base - h.issues.reduce((s, i) => s + weight[i.severity], 0)));
  return h;
}
