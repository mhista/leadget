import "server-only";
import type { PageSpeed } from "@/lib/types";

/**
 * Google PageSpeed Insights, mobile. Real Lighthouse numbers plus a phone
 * screenshot — far more convincing in a pitch than "your site felt slow".
 *
 * Works without a key at low volume; PAGESPEED_API_KEY (free, Google Cloud →
 * enable "PageSpeed Insights API") lifts the limit. A run takes 10–40 seconds,
 * so it only happens on a single audit or when you share a report, never on
 * bulk audits.
 */
export async function pageSpeed(url: string): Promise<{ ok: true; data: PageSpeed } | { ok: false; error: string }> {
  const u = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  u.searchParams.set("url", url);
  u.searchParams.set("strategy", "mobile");
  for (const c of ["performance", "seo", "accessibility"]) u.searchParams.append("category", c);
  if (process.env.PAGESPEED_API_KEY) u.searchParams.set("key", process.env.PAGESPEED_API_KEY);

  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(60_000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg: string = body?.error?.message ?? `PageSpeed returned ${res.status}`;
      if (res.status === 429) return { ok: false, error: "PageSpeed's free limit was hit. Add a PAGESPEED_API_KEY, or try again in a minute." };
      if (/FAILED_DOCUMENT_REQUEST|ERRORED_DOCUMENT_REQUEST|NO_FCP/i.test(msg)) return { ok: false, error: "Google couldn't load the site to measure it." };
      return { ok: false, error: msg.slice(0, 160) };
    }
    const lh = body.lighthouseResult ?? {};
    const a = lh.audits ?? {};
    const cat = lh.categories ?? {};
    const pct = (x: any) => (typeof x?.score === "number" ? Math.round(x.score * 100) : null);
    const num = (x: any) => (typeof x?.numericValue === "number" ? Math.round(x.numericValue) : null);
    return {
      ok: true,
      data: {
        checked_at: new Date().toISOString(),
        performance: pct(cat.performance) ?? 0,
        seo: pct(cat.seo),
        accessibility: pct(cat.accessibility),
        lcp_ms: num(a["largest-contentful-paint"]),
        fcp_ms: num(a["first-contentful-paint"]),
        tbt_ms: num(a["total-blocking-time"]),
        cls: typeof a["cumulative-layout-shift"]?.numericValue === "number" ? Math.round(a["cumulative-layout-shift"].numericValue * 1000) / 1000 : null,
        screenshot: typeof a["final-screenshot"]?.details?.data === "string" ? a["final-screenshot"].details.data : null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.name === "TimeoutError" ? "PageSpeed took too long — the site may be very slow." : "Couldn't reach PageSpeed." };
  }
}

/** Turn PageSpeed numbers into the same plain-words issues the audit uses. */
export function pageSpeedIssues(ps: PageSpeed) {
  const out: { id: string; severity: "high" | "medium" | "low"; title: string; pitch: string }[] = [];
  if (ps.performance < 50) {
    out.push({ id: "ps-perf", severity: "high", title: `Google speed score ${ps.performance}/100 on mobile`, pitch: `Google scores your site ${ps.performance} out of 100 for speed on phones — that affects both visitors and where you show up in search.` });
  } else if (ps.performance < 75) {
    out.push({ id: "ps-perf", severity: "medium", title: `Google speed score ${ps.performance}/100 on mobile`, pitch: `Google scores your site ${ps.performance} out of 100 for speed on phones; above 90 is what you want.` });
  }
  if (ps.lcp_ms && ps.lcp_ms > 4000) {
    out.push({ id: "ps-lcp", severity: "medium", title: `Main content takes ${(ps.lcp_ms / 1000).toFixed(1)}s to appear`, pitch: `On a phone, the main part of your homepage takes about ${Math.round(ps.lcp_ms / 1000)} seconds to show up.` });
  }
  if (ps.seo !== null && ps.seo < 80) {
    out.push({ id: "ps-seo", severity: "low", title: `Search basics score ${ps.seo}/100`, pitch: `Google's own check gives your site ${ps.seo}/100 on search basics, which is easy to fix.` });
  }
  return out;
}
