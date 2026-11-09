import type { Mockup, Prospect, Settings } from "@/lib/types";
import { themeFor, type Theme } from "@/lib/mockup";
import { industryLabel } from "@/lib/industries";
import { waNumber } from "@/lib/links";

/**
 * The mock-up itself: a one-page site for the prospect's business, built
 * from what's known about them and laid out for their kind of business.
 * Four layouts share the same content:
 *
 *   editorial  words first (law, finance, schools): a big considered
 *              headline, a short statement, services as a written list
 *   visual     pictures first (property, food, salons): their photo full
 *              width with the name over it, services beside pictures
 *   care       tasks first (clinics, pharmacies): book / order / call as
 *              large actions right at the top
 *   works      strong and practical (logistics, construction): heavy
 *              condensed type and a solid accent band
 *
 * Their own photos come from their current site (or are added in the
 * editor). Without photos each layout still stands on type and colour.
 * Pure markup (no hooks): it renders the public /m page and the editor's
 * live preview. A slim bar makes clear it's a concept, not their live site.
 */

const I = {
  chat: <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.2z" />,
  phone: <path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />,
  cal: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
};
const Svg = ({ d, className = "h-4 w-4", fill = false }: { d: React.ReactNode; className?: string; fill?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

/** A photo as a background, so a picture that won't load just leaves the panel's colour. */
const Photo = ({ src, className = "", style, label }: { src: string; className?: string; style?: React.CSSProperties; label: string }) => (
  <div role="img" aria-label={label} className={className}
    style={{ backgroundImage: `url("${src.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "var(--m-line)", borderRadius: "var(--m-r)", ...style }} />
);

type Cta = { href: string; label: string; icon: React.ReactNode };

export function MockupSite({ p, m, s, preview }: { p: Prospect; m: Mockup; s: Settings; preview?: boolean }) {
  const t = themeFor(m.theme);
  const wa = p.phone ? `https://wa.me/${waNumber(p.phone, p.country)}` : "";
  const cta: Cta =
    m.cta === "whatsapp" && wa ? { href: wa, label: "Chat on WhatsApp", icon: I.chat }
      : m.cta === "email" && p.email ? { href: `mailto:${p.email}`, label: "Email us", icon: I.mail }
        : p.phone ? { href: `tel:${p.phone}`, label: "Call us", icon: I.phone }
          : { href: "#contact", label: "Get in touch", icon: I.mail };
  const place = [p.city, p.country].filter(Boolean).join(", ");
  const sender = s.your_name || s.business_name || "a designer";
  const senderLink = s.phone ? `https://wa.me/${waNumber(s.phone)}` : s.sender_email ? `mailto:${s.sender_email}` : s.website || "";
  const hero = m.images?.hero || "";
  const gallery = (m.images?.gallery ?? []).filter(Boolean).slice(0, 4);
  const logo = m.images?.logo || "";
  const services = m.services.filter((x) => x.title);
  const highlights = m.highlights.filter(Boolean);

  const vars = {
    "--m-bg": t.bg, "--m-surface": t.surface, "--m-ink": t.ink, "--m-muted": t.muted, "--m-line": t.line,
    "--m-accent": t.accent, "--m-accent-ink": t.accentInk, "--m-hero": t.hero, "--m-hero-ink": t.heroInk, "--m-hero-muted": t.heroMuted,
    "--m-r": `${t.radius}px`, "--m-display": t.display, fontFamily: t.body,
  } as React.CSSProperties;
  const ctx = { p, m, t, cta, place, hero, gallery, services, highlights, wa };

  return (
    <div style={vars} className="min-h-full bg-[var(--m-bg)] text-[var(--m-ink)] antialiased">
      {/* React hoists this into <head>; the two families for this look. */}
      <link rel="stylesheet" href={t.fonts} precedence="default" />
      <style>{`@layer components{.m-d{font-family:var(--m-display);font-weight:500;letter-spacing:-0.015em}.m-btn{display:inline-flex;align-items:center;gap:.55rem;height:3rem;padding:0 1.4rem;font-weight:600;font-size:15px;border-radius:min(var(--m-r),999px);transition:filter .2s}.m-btn:hover{filter:brightness(1.08)}.m-wrap{max-width:72rem;margin-inline:auto;padding-inline:1.25rem}@media(min-width:768px){.m-wrap{padding-inline:2rem}}}`}</style>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#1b1b1b] px-4 py-2 text-center text-[12.5px] text-white/85">
        <span>Concept preview for {p.name}, designed by {sender}. Not live yet.</span>
        {senderLink && !preview && (
          <a href={senderLink} target="_blank" rel="noreferrer" className="rounded-full bg-white/15 px-3 py-0.5 font-medium text-white hover:bg-white/25">Like it? Talk to {sender.split(" ")[0]}</a>
        )}
      </div>

      <Nav {...ctx} logo={logo} />
      {t.layout === "visual" ? <VisualHero {...ctx} /> : t.layout === "care" ? <CareHero {...ctx} /> : t.layout === "works" ? <WorksHero {...ctx} /> : <EditorialHero {...ctx} />}

      {highlights.length > 0 && (
        <section className="border-y border-[var(--m-line)] bg-[var(--m-surface)]">
          <ul className="m-wrap grid gap-x-8 gap-y-3 py-6 sm:grid-cols-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-[15px] font-medium">
                <Svg d={I.check} className="h-5 w-5 shrink-0 text-[var(--m-accent)]" />{h}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Services {...ctx} />

      {gallery.length >= 2 && (
        <section className="m-wrap pb-20" aria-label={`Photos of ${p.name}`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {gallery.map((g, i) => <Photo key={g} src={g} label={`${p.name}, photo ${i + 1}`} className={i === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-[4/3]"} />)}
          </div>
        </section>
      )}

      <About {...ctx} />

      <section className="px-5 py-20 md:py-24">
        <div className="m-wrap text-center">
          <h2 className="m-d mx-auto max-w-[18ch] text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[1.08]">{closing(p.industry, p.name)}</h2>
          <a href={cta.href} className="m-btn mt-8 bg-[var(--m-accent)] text-[var(--m-accent-ink)]"><Svg d={cta.icon} /> {cta.label}</a>
        </div>
      </section>

      <footer className="border-t border-[var(--m-line)] py-8 text-[13px] text-[var(--m-muted)]">
        <div className="m-wrap flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} {p.name}</span>
          {place && <span>{place}</span>}
        </div>
      </footer>
    </div>
  );
}

/** The last line, in the language of the trade rather than "Ready when you are". */
function closing(industry: string, name: string) {
  const by: Record<string, string> = {
    law: "Tell us about your matter. We'll tell you where you stand.",
    finance: "Bring us the numbers. We'll make them make sense.",
    "real-estate": "Seen something you like? Book a viewing today.",
    restaurant: "Hungry? Your table, or your order, is a message away.",
    hotel: "Your room is ready when you are. Book direct.",
    clinic: "Book your appointment in a minute.",
    dental: "Book your check-up in a minute.",
    pharmacy: "Need a refill? Order it now and collect or get it delivered.",
    logistics: "Got something to move? Get a quote today.",
    construction: "Planning a build? Let's talk about it on site.",
    salon: "Your next appointment is one message away.",
    gym: "Your first session starts with one message.",
    school: "Come and see us. Book a visit.",
    church: "You're welcome here. Come and join us.",
  };
  return by[industry] ?? `Get in touch with ${name} today.`;
}

type Ctx = { p: Prospect; m: Mockup; t: Theme; cta: Cta; place: string; hero: string; gallery: string[]; services: { title: string; body: string }[]; highlights: string[]; wa: string };

function Nav({ p, cta, logo, t }: Ctx & { logo: string }) {
  const dark = t.layout === "works";
  return (
    <header className={`sticky top-0 z-20 border-b backdrop-blur ${dark ? "border-white/10 text-[var(--m-hero-ink)]" : "border-[var(--m-line)]"}`}
      style={{ background: `color-mix(in srgb, ${dark ? "var(--m-hero)" : "var(--m-bg)"} 94%, transparent)` }}>
      <div className="m-wrap flex h-16 items-center justify-between gap-4">
        <a href="#top" className="flex min-w-0 items-center gap-3">
          {logo ? <span role="img" aria-label={`${p.name} logo`} className="h-9 w-24 shrink-0 bg-contain bg-left bg-no-repeat" style={{ backgroundImage: `url("${logo.replace(/"/g, "%22")}")` }} /> : null}
          <span className={`m-d truncate ${t.layout === "works" ? "text-[19px] font-[800] [font-stretch:80%]" : "text-[19px]"}`}>{p.name}</span>
        </a>
        <nav className={`hidden items-center gap-7 text-[14.5px] md:flex ${dark ? "text-[var(--m-hero-muted)]" : "text-[var(--m-muted)]"}`}>
          <a href="#services" className="hover:opacity-100 hover:text-current">Services</a>
          <a href="#about" className="hover:text-current">About</a>
          <a href="#contact" className="hover:text-current">Contact</a>
        </nav>
        <a href={cta.href} className="m-btn h-10 shrink-0 bg-[var(--m-accent)] px-4 text-[14px] text-[var(--m-accent-ink)]"><Svg d={cta.icon} /><span className="hidden sm:inline">{cta.label}</span></a>
      </div>
    </header>
  );
}

const Rating = ({ p, onDark }: { p: Prospect; onDark?: boolean }) => p.rating ? (
  <p className={`flex items-center gap-2 text-[14px] ${onDark ? "text-white/80" : "text-[var(--m-muted)]"}`}>
    <span className="flex text-[#E9A92E]">{[0, 1, 2, 3, 4].map((i) => <Svg key={i} d={I.star} fill className="h-4 w-4" />)}</span>
    <span><strong className={onDark ? "text-white" : "text-[var(--m-ink)]"}>{p.rating.toFixed(1)}</strong>{p.reviews ? ` from ${p.reviews.toLocaleString()} Google reviews` : " on Google"}</span>
  </p>
) : null;

/* ── Heroes ──────────────────────────────────────────────────────────── */

function EditorialHero({ p, m, cta, place, hero }: Ctx) {
  return (
    <section id="top">
      <div className="m-wrap grid gap-10 pb-16 pt-16 md:grid-cols-12 md:pb-24 md:pt-24">
        <div className="md:col-span-8">
          <p className="text-[15px] text-[var(--m-muted)]">{industryLabel(p.industry)}{place ? ` in ${place}` : ""}</p>
          <h1 className="m-d mt-5 text-[clamp(2.7rem,1.6rem+4.6vw,5.6rem)] leading-[1.02] [text-wrap:balance]">{m.headline}</h1>
        </div>
        <div className="flex flex-col justify-end gap-6 border-t-2 border-[var(--m-ink)] pt-6 md:col-span-4 md:border-l-2 md:border-t-0 md:pl-8 md:pt-0">
          <p className="text-[17px] leading-[1.6] text-[var(--m-muted)]">{m.tagline}</p>
          <div className="flex flex-wrap gap-3">
            <a href={cta.href} className="m-btn bg-[var(--m-accent)] text-[var(--m-accent-ink)]"><Svg d={cta.icon} /> {cta.label}</a>
          </div>
          <Rating p={p} />
        </div>
      </div>
      {hero && <div className="m-wrap pb-6"><Photo src={hero} label={p.name} className="aspect-[21/8] w-full" /></div>}
    </section>
  );
}

function VisualHero({ p, m, cta, place, hero, gallery, t }: Ctx) {
  if (hero) {
    return (
      <section id="top" className="relative isolate min-h-[min(88vh,760px)] overflow-hidden text-white">
        <Photo src={hero} label={p.name} className="absolute inset-0 -z-10" style={{ borderRadius: 0 }} />
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: `linear-gradient(180deg, transparent 25%, ${t.hero}E6 88%)` }} />
        <div className="m-wrap flex min-h-[min(88vh,760px)] flex-col justify-end pb-14 pt-32">
          <p className="text-[15px] text-white/80">{industryLabel(p.industry)}{place ? `, ${place}` : ""}</p>
          <h1 className="m-d mt-3 max-w-[16ch] text-[clamp(2.8rem,1.6rem+5vw,6rem)] leading-[1] [text-wrap:balance]">{m.headline}</h1>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <p className="max-w-[48ch] text-[17px] leading-relaxed text-white/85">{m.tagline}</p>
            <div className="flex flex-col items-start gap-3">
              <a href={cta.href} className="m-btn bg-[var(--m-accent)] text-[var(--m-accent-ink)]"><Svg d={cta.icon} /> {cta.label}</a>
              <Rating p={p} onDark />
            </div>
          </div>
        </div>
      </section>
    );
  }
  // No photo yet: the name itself is the picture.
  return (
    <section id="top" className="bg-[var(--m-hero)] text-[var(--m-hero-ink)]">
      <div className="m-wrap grid items-end gap-10 pb-16 pt-20 md:grid-cols-[1.4fr_1fr] md:pb-24 md:pt-28">
        <div>
          <p className="text-[15px] text-[var(--m-hero-muted)]">{industryLabel(p.industry)}{place ? `, ${place}` : ""}</p>
          <h1 className="m-d mt-4 text-[clamp(2.8rem,1.6rem+5vw,6rem)] leading-[1] [text-wrap:balance]">{m.headline}</h1>
          <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-[var(--m-hero-muted)]">{m.tagline}</p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <a href={cta.href} className="m-btn bg-[var(--m-accent)] text-[var(--m-accent-ink)]"><Svg d={cta.icon} /> {cta.label}</a>
            <Rating p={p} onDark />
          </div>
        </div>
        {gallery[0] ? <Photo src={gallery[0]} label={p.name} className="aspect-[4/5] w-full" /> : (
          <div aria-hidden className="hidden aspect-[4/5] w-full place-items-center border border-white/15 md:grid" style={{ borderRadius: "var(--m-r)", background: `radial-gradient(120% 90% at 100% 0%, ${t.accent}55, transparent 60%)` }}>
            <span className="m-d text-[9rem] leading-none text-white/90">{initials(p.name)}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function CareHero({ p, m, cta, place, hero, wa }: Ctx) {
  const tasks = careTasks(p.industry, cta, wa, p.phone);
  return (
    <section id="top" className="bg-[var(--m-hero)] text-[var(--m-hero-ink)]">
      <div className="m-wrap grid items-center gap-10 pb-16 pt-14 md:grid-cols-[1.15fr_1fr] md:pb-20 md:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 text-[15px] font-medium text-[var(--m-accent)]"><Svg d={I.pin} /> {place || industryLabel(p.industry)}</p>
          <h1 className="m-d mt-4 text-[clamp(2.5rem,1.6rem+3.6vw,4.6rem)] font-[700] leading-[1.04] [text-wrap:balance]">{m.headline}</h1>
          <p className="mt-5 max-w-[46ch] text-[17.5px] leading-relaxed text-[var(--m-hero-muted)]">{m.tagline}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {tasks.map((x, i) => (
              <a key={x.label} href={x.href} className={`flex flex-col gap-3 p-4 text-[15px] font-semibold transition hover:-translate-y-0.5 ${i === 0 ? "bg-[var(--m-accent)] text-[var(--m-accent-ink)]" : "bg-[var(--m-surface)] text-[var(--m-ink)]"}`} style={{ borderRadius: "var(--m-r)" }}>
                <Svg d={x.icon} className="h-6 w-6" />{x.label}
              </a>
            ))}
          </div>
          <div className="mt-6"><Rating p={p} /></div>
        </div>
        {hero ? <Photo src={hero} label={p.name} className="aspect-[5/4] w-full" /> : (
          <div aria-hidden className="hidden aspect-[5/4] w-full place-items-center bg-[var(--m-surface)] md:grid" style={{ borderRadius: "var(--m-r)" }}>
            <svg viewBox="0 0 120 120" className="h-40 w-40 text-[var(--m-accent)]"><path d="M48 18h24v30h30v24H72v30H48V72H18V48h30z" fill="currentColor" opacity=".9" /></svg>
          </div>
        )}
      </div>
    </section>
  );
}

function careTasks(industry: string, cta: Cta, wa: string, phone: string) {
  const call = phone ? { href: `tel:${phone}`, label: "Call us", icon: I.phone } : cta;
  const msg = wa ? { href: wa, label: "Ask on WhatsApp", icon: I.chat } : cta;
  const first = industry === "pharmacy"
    ? { href: msg.href, label: "Order a refill", icon: I.check }
    : { href: msg.href, label: industry === "dental" ? "Book a check-up" : "Book an appointment", icon: I.cal };
  return [first, msg.label === first.label ? call : msg, call].filter((x, i, a) => a.findIndex((y) => y.label === x.label) === i);
}

function WorksHero({ p, m, cta, place, hero }: Ctx) {
  return (
    <section id="top" className="bg-[var(--m-hero)] text-[var(--m-hero-ink)]">
      <div className="m-wrap pb-0 pt-16 md:pt-24">
        <p className="text-[15px] text-[var(--m-hero-muted)]">{industryLabel(p.industry)}{place ? `, ${place}` : ""}</p>
        <h1 className="m-d mt-4 max-w-[14ch] text-[clamp(3rem,1.4rem+6.4vw,7.2rem)] font-[800] leading-[.92] [font-stretch:72%] [text-wrap:balance]">{m.headline}</h1>
        <div className="mt-8 flex flex-wrap items-center gap-6 pb-14">
          <a href={cta.href} className="m-btn bg-[var(--m-accent)] text-[var(--m-accent-ink)]"><Svg d={cta.icon} /> {cta.label}</a>
          <p className="max-w-[44ch] text-[16.5px] leading-relaxed text-[var(--m-hero-muted)]">{m.tagline}</p>
        </div>
      </div>
      {hero ? <Photo src={hero} label={p.name} className="aspect-[21/7] w-full" style={{ borderRadius: 0 }} /> : <div aria-hidden className="h-3 bg-[var(--m-accent)]" />}
    </section>
  );
}

/* ── Services, about ─────────────────────────────────────────────────── */

function Services({ p, t, services, gallery }: Ctx) {
  const listed = t.layout === "editorial" || t.layout === "works";
  return (
    <section id="services" className="py-20 md:py-24">
      <div className="m-wrap">
        <h2 className={`m-d max-w-[20ch] text-[clamp(2rem,1.4rem+2vw,3.1rem)] leading-[1.08] ${t.layout === "works" ? "font-[800] [font-stretch:80%]" : ""}`}>What {p.name} can do for you</h2>
        {listed ? (
          <dl className="mt-12 grid gap-x-12 md:grid-cols-2">
            {services.map((sv) => (
              <div key={sv.title} className="border-t border-[var(--m-line)] py-6">
                <dt className="m-d text-[1.45rem] leading-snug">{sv.title}</dt>
                <dd className="mt-2 max-w-[52ch] text-[16px] leading-relaxed text-[var(--m-muted)]">{sv.body}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {services.map((sv, i) => (
              <div key={sv.title} className="flex gap-5">
                {gallery[i + 1] ? <Photo src={gallery[i + 1]} label={sv.title} className="h-24 w-24 shrink-0" /> : <span aria-hidden className="mt-2 h-3 w-3 shrink-0 bg-[var(--m-accent)]" style={{ borderRadius: t.radius > 10 ? 999 : 0 }} />}
                <div>
                  <h3 className="m-d text-[1.4rem] leading-snug">{sv.title}</h3>
                  <p className="mt-2 max-w-[44ch] text-[16px] leading-relaxed text-[var(--m-muted)]">{sv.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function About({ p, m, place, wa }: Ctx) {
  const where = [p.address, place].filter(Boolean).join(", ");
  return (
    <section id="about" className="bg-[var(--m-surface)] py-20 md:py-24">
      <div className="m-wrap grid gap-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="m-d text-[clamp(2rem,1.4rem+2vw,3rem)] leading-[1.08]">About {p.name}</h2>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-[1.7] text-[var(--m-muted)]">{m.about}</p>
          <div className="mt-6"><Rating p={p} /></div>
        </div>
        <div id="contact" className="border border-[var(--m-line)] bg-[var(--m-bg)] p-7" style={{ borderRadius: "var(--m-r)" }}>
          <h3 className="m-d text-[1.6rem]">Visit or get in touch</h3>
          <ul className="mt-5 space-y-4 text-[15.5px]">
            {where && <li className="flex gap-3"><Svg d={I.pin} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--m-accent)]" />{where}</li>}
            {p.phone && <li className="flex gap-3"><Svg d={I.phone} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--m-accent)]" /><a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a></li>}
            {p.email && <li className="flex gap-3"><Svg d={I.mail} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--m-accent)]" /><a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a></li>}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            {wa && <a href={wa} className="m-btn h-11 bg-[#1FA855] text-white"><Svg d={I.chat} /> WhatsApp</a>}
            {p.phone && <a href={`tel:${p.phone}`} className="m-btn h-11 border border-[var(--m-line)] bg-[var(--m-surface)]"><Svg d={I.phone} /> Call</a>}
          </div>
          {where && (
            <iframe title={`Map of ${p.name}`} loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent([p.name, where].join(", "))}&output=embed`}
              className="mt-6 h-48 w-full border border-[var(--m-line)]" style={{ borderRadius: "var(--m-r)" }} />
          )}
        </div>
      </div>
    </section>
  );
}

const initials = (name: string) => name.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "·";
