import type { Mockup, Prospect, Settings } from "@/lib/types";
import { THEME, THEMES } from "@/lib/mockup";
import { industryLabel } from "@/lib/industries";
import { waNumber } from "@/lib/links";

/**
 * The mock-up itself: a one-page site for the prospect's business, themed and
 * written from what's known about them. Pure markup (no hooks) so the same
 * component renders the public /m page and the live preview in the editor.
 *
 * A slim banner makes clear it's a concept by you, not their live site.
 */

const I = {
  chat: <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.2z" />,
  phone: <path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />,
};
const Svg = ({ d, className = "h-4 w-4", fill = false }: { d: React.ReactNode; className?: string; fill?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

export function MockupSite({ p, m, s, preview }: { p: Prospect; m: Mockup; s: Settings; preview?: boolean }) {
  const t = THEME[m.theme] ?? THEMES[0];
  const wa = p.phone ? `https://wa.me/${waNumber(p.phone, p.country)}` : "";
  const cta =
    m.cta === "whatsapp" && wa ? { href: wa, label: "Chat on WhatsApp", icon: I.chat }
      : m.cta === "email" && p.email ? { href: `mailto:${p.email}`, label: "Email us", icon: I.mail }
        : p.phone ? { href: `tel:${p.phone}`, label: "Call us", icon: I.phone }
          : { href: "#contact", label: "Get in touch", icon: I.arrow };
  const initials = p.name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const place = [p.city, p.country].filter(Boolean).join(", ");
  const sender = s.your_name || s.business_name || "a designer";
  const senderLink = s.phone ? `https://wa.me/${waNumber(s.phone)}` : s.sender_email ? `mailto:${s.sender_email}` : s.website || "";

  const vars = {
    "--m-bg": t.bg, "--m-surface": t.surface, "--m-ink": t.ink, "--m-muted": t.muted, "--m-line": t.line,
    "--m-accent": t.accent, "--m-accent-ink": t.accentInk, "--m-hero": t.hero, "--m-hero-ink": t.heroInk, "--m-hero-muted": t.heroMuted,
  } as React.CSSProperties;
  const display = { fontFamily: t.display, letterSpacing: "-0.02em", fontWeight: 400 } as React.CSSProperties;

  return (
    <div style={vars} className="min-h-full bg-[var(--m-bg)] font-body text-[var(--m-ink)] antialiased">
      {/* Concept banner */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[var(--m-accent)] px-4 py-2 text-center text-[12.5px] text-[var(--m-accent-ink)]">
        <span><strong>Concept preview</strong> for {p.name}, designed by {sender}. Not live yet.</span>
        {senderLink && !preview && (
          <a href={senderLink} target="_blank" rel="noreferrer" className="rounded-full bg-black/15 px-3 py-0.5 font-medium hover:bg-black/25">Like it? Talk to {sender.split(" ")[0]} →</a>
        )}
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-[var(--m-line)] backdrop-blur" style={{ background: "color-mix(in srgb, var(--m-bg) 90%, transparent)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--m-hero)] text-[13px] font-semibold text-[var(--m-hero-ink)]">{initials || "·"}</span>
            <span className="text-[16px] font-semibold tracking-tight">{p.name}</span>
          </a>
          <nav className="hidden items-center gap-7 text-[14px] text-[var(--m-muted)] md:flex">
            <a href="#services" className="hover:text-[var(--m-ink)]">Services</a>
            <a href="#about" className="hover:text-[var(--m-ink)]">About</a>
            <a href="#contact" className="hover:text-[var(--m-ink)]">Contact</a>
          </nav>
          <a href={cta.href} className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--m-accent)] px-4 text-[13.5px] font-medium text-[var(--m-accent-ink)] transition hover:brightness-110">
            <Svg d={cta.icon} /> <span className="hidden sm:inline">{cta.label}</span>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden bg-[var(--m-hero)] text-[var(--m-hero-ink)]">
        <div aria-hidden className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl" style={{ background: t.accent }} />
        <div aria-hidden className="absolute inset-0 opacity-[.07]" style={{ backgroundImage: `linear-gradient(${t.heroInk} 1px, transparent 1px), linear-gradient(90deg, ${t.heroInk} 1px, transparent 1px)`, backgroundSize: "56px 56px" }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.25fr_1fr] md:py-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12.5px] text-[var(--m-hero-muted)]">
              <Svg d={I.pin} className="h-3.5 w-3.5" /> {industryLabel(p.industry)}{place ? ` · ${place}` : ""}
            </p>
            <h1 style={display} className="text-[clamp(2.4rem,1.6rem+3.4vw,4.4rem)] leading-[1.04]">{m.headline}</h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-[var(--m-hero-muted)]">{m.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={cta.href} className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--m-accent)] px-6 text-[15px] font-medium text-[var(--m-accent-ink)] shadow-lg transition hover:brightness-110">
                <Svg d={cta.icon} /> {cta.label}
              </a>
              <a href="#services" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] transition hover:bg-white/10">
                Our services <Svg d={I.arrow} />
              </a>
            </div>
            {p.rating ? (
              <p className="mt-8 flex items-center gap-2 text-[14px] text-[var(--m-hero-muted)]">
                <span className="flex text-[#F5B83D]">{[0, 1, 2, 3, 4].map((i) => <Svg key={i} d={I.star} fill className="h-4 w-4" />)}</span>
                <span><strong className="text-[var(--m-hero-ink)]">{p.rating.toFixed(1)}</strong>{p.reviews ? ` from ${p.reviews.toLocaleString()} Google reviews` : " on Google"}</span>
              </p>
            ) : null}
          </div>

          {/* Enquiry card — shows the feature, not a working form */}
          <div className="relative hidden md:block">
            <div aria-hidden className="absolute -left-6 top-10 h-full w-full rounded-3xl border border-white/10 bg-white/[.04]" />
            <div className="relative rounded-3xl bg-[var(--m-surface)] p-7 text-[var(--m-ink)] shadow-2xl">
              <p style={display} className="text-[1.6rem] leading-tight">Quick enquiry</p>
              <p className="mt-1 text-[13.5px] text-[var(--m-muted)]">We usually reply within the hour.</p>
              <div className="mt-6 space-y-3">
                {["Your name", "Phone or WhatsApp", `What do you need${p.industry === "real-estate" ? " — buy, rent or sell?" : "?"}`].map((f) => (
                  <div key={f} className="rounded-xl border border-[var(--m-line)] bg-[var(--m-bg)] px-4 py-3 text-[14px] text-[var(--m-muted)]">{f}</div>
                ))}
              </div>
              <div className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--m-accent)] text-[15px] font-medium text-[var(--m-accent-ink)]">
                Send enquiry <Svg d={I.arrow} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-b border-[var(--m-line)] bg-[var(--m-surface)]">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-6 sm:grid-cols-3">
          {m.highlights.filter(Boolean).map((h) => (
            <p key={h} className="flex items-center gap-3 text-[14.5px] font-medium">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--m-accent)] text-[var(--m-accent-ink)]"><Svg d={I.check} className="h-3.5 w-3.5" /></span>{h}
            </p>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="px-5 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-[12px] font-semibold uppercase tracking-[.14em] text-[var(--m-accent)]">What we do</p>
          <h2 style={display} className="mt-3 max-w-2xl text-[clamp(2rem,1.5rem+1.8vw,3rem)] leading-[1.08]">Everything you need from {p.name}</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {m.services.filter((x) => x.title).map((sv, i) => (
              <div key={i} className="group rounded-2xl border border-[var(--m-line)] bg-[var(--m-surface)] p-6 transition hover:-translate-y-1 hover:shadow-xl">
                <span style={display} className="text-[2rem] leading-none text-[var(--m-accent)]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 text-[17px] font-semibold">{sv.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--m-muted)]">{sv.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About + contact */}
      <section id="about" className="bg-[var(--m-surface)] px-5 py-20 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[.14em] text-[var(--m-accent)]">About us</p>
            <h2 style={display} className="mt-3 text-[clamp(2rem,1.5rem+1.8vw,3rem)] leading-[1.08]">{p.name}</h2>
            <p className="mt-5 max-w-[52ch] text-[16.5px] leading-relaxed text-[var(--m-muted)]">{m.about}</p>
          </div>
          <div id="contact" className="rounded-3xl border border-[var(--m-line)] bg-[var(--m-bg)] p-7">
            <h3 style={display} className="text-[1.6rem]">Get in touch</h3>
            <ul className="mt-5 space-y-4 text-[15px]">
              {(p.address || place) && <li className="flex gap-3"><Svg d={I.pin} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--m-accent)]" />{[p.address, place].filter(Boolean).join(", ")}</li>}
              {p.phone && <li className="flex gap-3"><Svg d={I.phone} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--m-accent)]" /><a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a></li>}
              {p.email && <li className="flex gap-3"><Svg d={I.mail} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--m-accent)]" /><a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a></li>}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              {wa && <a href={wa} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1FA855] px-5 text-[14px] font-medium text-white"><Svg d={I.chat} /> WhatsApp</a>}
              {p.phone && <a href={`tel:${p.phone}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--m-line)] bg-[var(--m-surface)] px-5 text-[14px] font-medium"><Svg d={I.phone} /> Call</a>}
            </div>
            {(p.address || place) && (
              <iframe
                title={`Map of ${p.name}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent([p.name, p.address, place].filter(Boolean).join(", "))}&output=embed`}
                className="mt-6 h-48 w-full rounded-2xl border border-[var(--m-line)]" loading="lazy"
              />
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[var(--m-hero)] px-8 py-14 text-center text-[var(--m-hero-ink)]">
          <div aria-hidden className="absolute left-1/2 top-0 h-60 w-60 -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: t.accent }} />
          <h2 style={display} className="relative text-[clamp(1.9rem,1.4rem+1.8vw,2.8rem)]">Ready when you are.</h2>
          <p className="relative mt-3 text-[var(--m-hero-muted)]">Message {p.name} and we&apos;ll get back to you quickly.</p>
          <a href={cta.href} className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--m-accent)] px-7 text-[15px] font-medium text-[var(--m-accent-ink)]"><Svg d={cta.icon} /> {cta.label}</a>
        </div>
      </section>

      <footer className="border-t border-[var(--m-line)] px-5 py-8 text-center text-[13px] text-[var(--m-muted)]">
        © {new Date().getFullYear()} {p.name}{place ? ` · ${place}` : ""}
      </footer>
    </div>
  );
}
