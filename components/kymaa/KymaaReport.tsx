import "./kymaa.css";
import clsx from "clsx";
import type { PageSpeed, ReportDoc } from "@/lib/types";
import { GRADES } from "@/lib/kymaa/report";
import { KymaaLogo } from "./Logo";

/**
 * The Kymaa website-check report. Markup and class names follow
 * kymaa-report.html one-to-one; this is its renderer ported to React.
 */

const IMPACT = { high: "High impact", medium: "Medium impact", low: "Low impact" } as const;
const pad = (n: number) => String(n).padStart(2, "0");
const nice = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const secs = (ms: number | null | undefined) => (ms == null ? "—" : (ms / 1000).toFixed(1));

export function KymaaReport({ d, speed, brand, site, fixed, page }: {
  d: ReportDoc; speed?: PageSpeed | null; brand?: string; site?: string;
  /** Pin the desktop layout (editor preview). */ fixed?: boolean;
  /** Full-page wrapper with the bone background. */ page?: boolean;
}) {
  const g = GRADES[d.grade] ?? GRADES.C;
  const total = Math.max(d.checksTotal || d.issues.length + d.wins.length, d.wins.length);
  const date = nice(d.checkedAt || new Date().toISOString().slice(0, 10));
  const showSpeed = d.showSpeed && !!speed;
  const siteHost = (site || "kymaa.tech").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const siteUrl = /^https?:/.test(site ?? "") ? site! : `https://${siteHost}`;
  let n = 0;
  const num = () => `(${pad(++n)})`;
  const perf = speed?.performance ?? 0;

  return (
    <div className={clsx("ky ky-r", fixed && "ky-fixed", page && "ky-page")}>
      <article className="sheet" aria-labelledby="biz">
        <header className="cover on-dark">
          <div className="top">
            <KymaaLogo className="logo" />
            <span className="mono">Website check · {date}</span>
          </div>
          <p className="mono marker for">Prepared for</p>
          <h1 className="disp biz" id="biz">{d.business.name}</h1>
          {d.business.domain && <a className="mono domain" href={d.business.url || undefined} target="_blank" rel="noopener noreferrer">{d.business.domain}</a>}

          <div className="verdict">
            <div className="grade" style={{ background: g.color }} aria-label={`Grade ${d.grade}`}><span>{d.grade}</span></div>
            <div>
              <h2 className="disp v-title">{d.verdict || g.verdict}</h2>
              <p className="v-sum">{d.summary}</p>
              <div className="score">
                <span className="bar" aria-hidden="true">{Array.from({ length: Math.min(total, 16) }, (_, i) => <i key={i} className={i < d.wins.length ? "ok" : ""} />)}</span>
                <span className="mono">{d.wins.length} of {total} checks passed</span>
              </div>
            </div>
          </div>
        </header>

        <div className="body">
          {d.issues.length > 0 && (
            <section aria-labelledby="fix-h">
              <div className="label mono"><span className="marker">{num()} / What to fix</span><span>{d.issues.length} {d.issues.length === 1 ? "item" : "items"}</span></div>
              <h2 className="disp h2" id="fix-h">What to <span className="serif">fix</span></h2>
              <p className="lede">In order of how much each one is likely costing you.</p>
              <ol className="issues">
                {d.issues.map((it, i) => (
                  <li className="issue" key={i}>
                    <span className="n">{pad(i + 1)}</span>
                    <div>
                      <h3 className="i-title">{it.title}</h3>
                      {it.why && <p className="i-why">{it.why}</p>}
                      {it.fix && <div className="i-fix"><span className="mono">The fix</span><p>{it.fix}</p></div>}
                    </div>
                    <span className={`mono impact ${it.impact}`}>{IMPACT[it.impact] ?? it.impact}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {showSpeed && speed && (
            <section aria-labelledby="speed-h">
              <div className="label mono"><span className="marker">{num()} / On a phone</span><span>Google PageSpeed</span></div>
              <h2 className="disp h2" id="speed-h">On a <span className="serif">phone</span></h2>
              <p className="lede">What your visitors see on mobile, measured by Google.</p>
              <div className="speed">
                {speed.screenshot ? (
                  <div className="phone">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={speed.screenshot} alt={`${d.business.name} on a phone`} />
                  </div>
                ) : <div />}
                <div>
                  <div className="stats">
                    <div><span className="mono">Speed score</span><p className={clsx("stat", perf >= 90 ? "good" : perf >= 50 ? "mid" : "bad")}>{perf}<small>/100</small></p></div>
                    <div><span className="mono">Main content</span><p className="stat">{secs(speed.lcp_ms)}<small>s</small></p></div>
                    <div><span className="mono">Search basics</span><p className="stat">{speed.seo ?? "—"}<small>/100</small></p></div>
                  </div>
                  <p className="speed-note">
                    {perf >= 90 ? "Fast on a phone. Keep it that way as you add content." : perf >= 50 ? "Usable, but slower than it should be. Every extra second loses visitors on mobile data." : "Slow on a phone. Many visitors will leave before the page finishes loading."}
                  </p>
                </div>
              </div>
            </section>
          )}

          {d.wins.length > 0 && (
            <section aria-labelledby="win-h">
              <div className="label mono"><span className="marker">{num()} / What’s working</span><span>{d.wins.length} passing</span></div>
              <h2 className="disp h2" id="win-h">What’s <span className="serif">working</span></h2>
              <ul className="wins">
                {d.wins.map((w, i) => (
                  <li className="win" key={i}>
                    <span className="tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.3 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg></span>
                    <div><div className="w-title">{w.title}</div>{w.detail && <div className="w-detail">{w.detail}</div>}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="plan on-dark" aria-labelledby="plan-h">
            <div className="label mono"><span className="marker">{num()} / The plan</span><span>{brand || "Kymaa"}</span></div>
            <h2 className="disp h2" id="plan-h">{d.planTitle || `What I’d do for ${d.business.name}`}</h2>
            <ol className="recs">
              {d.recommendations.filter((r) => r.title).map((r, i) => (
                <li key={i}><div><div className="r-title">{r.title}</div>{r.detail && <div className="r-detail">{r.detail}</div>}</div></li>
              ))}
            </ol>
            <div className="sign">
              <div className="who">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.preparer.photo && <img src={d.preparer.photo} alt={d.preparer.name} />}
                <div><b>{d.preparer.name}</b><span>{d.preparer.role}</span></div>
              </div>
              <div className="ctas">
                {d.cta.primary.url && <a className="btn" href={d.cta.primary.url} target="_blank" rel="noopener noreferrer"><span>{d.cta.primary.label}</span> <span aria-hidden="true">→</span></a>}
                {d.cta.secondary?.url && <a className="btn btn-line" href={d.cta.secondary.url} target="_blank" rel="noopener noreferrer"><span>{d.cta.secondary.label}</span></a>}
              </div>
            </div>
          </section>
        </div>

        <footer className="foot mono">
          <span>Checked on {date}.{showSpeed ? " Speed figures from Google PageSpeed (mobile)." : ""} Results can vary between visits.</span>
          <a href={siteUrl} target="_blank" rel="noopener noreferrer">{siteHost}</a>
        </footer>
      </article>
    </div>
  );
}
