import Link from "next/link";
import { PLANS } from "@/lib/saas/plans";
import { SWIPE_CATEGORIES } from "@/lib/swipe";
import { PLAYBOOKS } from "@/lib/industries";
import { btn } from "@/components/ui";
import { Logo, IconCheck, IconGlobe, IconSearch, IconSparkle, IconClock, IconZap, IconArrowRight, IconStar, IconMail } from "@/components/icons";

export const metadata = {
  title: "Leadget — find businesses that need what you build",
  description: "Search any city for businesses with no website or a broken one, see exactly what to fix, and pitch them with an angle that fits.",
  robots: { index: true, follow: true },
};

/* A static, hand-drawn preview of the app. No screenshots to go stale, and it
   themes with the page. */
function Preview() {
  const rows = [
    { n: "Harbour Point Realty", m: "Real estate · Dubai", tag: "4 issues", tone: "text-danger", s: 88 },
    { n: "MedCare Pharmacy", m: "Pharmacy · Houston", tag: "No website", tone: "text-warning", s: 81 },
    { n: "Aldgate & Finch", m: "Law firm · London", tag: "Not secure", tone: "text-danger", s: 74 },
    { n: "Palm Crest Clinic", m: "Clinic · Nairobi", tag: "No website", tone: "text-warning", s: 69 },
    { n: "Osu Boutique Hotel", m: "Hotel · Accra", tag: "Slow (6.1s)", tone: "text-warning", s: 57 },
  ];
  return (
    <div className="relative mx-auto max-w-5xl">
      <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-10 rounded-[40px] bg-accent/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
        <div className="flex items-center gap-1.5 border-b border-line bg-sunken px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F46E62]" /><span className="h-2.5 w-2.5 rounded-full bg-[#F0B040]" /><span className="h-2.5 w-2.5 rounded-full bg-[#58C88A]" />
          <span className="ml-3 rounded-md bg-page-alt px-3 py-0.5 text-[11px] text-faint">leadget · prospects</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] max-sm:grid-cols-1">
          <div className="bg-rail p-4 text-rail-ink max-sm:hidden">
            <div className="mb-5 flex items-center gap-2"><Logo className="h-6 w-6" /><span className="display">Leadget</span></div>
            {["Overview", "Find leads", "Prospects", "Pipeline", "Follow-ups", "Templates"].map((l, i) => (
              <div key={l} className={`relative mb-0.5 rounded-md px-3 py-2 text-[12px] ${i === 2 ? "bg-white/[.07]" : "text-rail-muted"}`}>
                {i === 2 && <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r bg-accent" />}{l}
              </div>
            ))}
          </div>
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {["No website", "Not secure", "Score 65+", "🇦🇪 UAE", "🇺🇸 United States"].map((c) => (
                <span key={c} className="rounded-pill border border-line bg-surface px-2.5 py-0.5 text-[11px]">{c}</span>
              ))}
            </div>
            <div className="divide-y divide-line rounded-lg border border-line">
              {rows.map((r) => (
                <div key={r.n} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-page-alt text-[12px] font-semibold">{r.n[0]}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium">{r.n}</span><span className="block truncate text-[11px] text-muted">{r.m}</span></span>
                  <span className={`hidden text-[11.5px] font-medium sm:block ${r.tone}`}>{r.tag}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full border-[3px] border-success/70 text-[10.5px] font-semibold">{r.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Welcome() {
  const features = [
    { icon: <IconSearch />, title: "Find", body: "Pick an industry and any city in 240+ countries. Search several areas at once. Businesses with no website are flagged straight away." },
    { icon: <IconGlobe />, title: "Audit", body: "One click checks their site the way a customer would — speed, security, phones, how to get in touch — and tells you what to say about it." },
    { icon: <IconSparkle />, title: "Pitch", body: `${SWIPE_CATEGORIES.length} angles in the swipe file, suggested per lead, or written by AI from the audit. Sent from your own inbox, not ours.` },
    { icon: <IconClock />, title: "Follow up", body: "Every message you log books the next touch. A pipeline, reminders and a daily list, so nobody slips through." },
  ];
  const faqs = [
    ["Does Leadget send emails for me?", "No — on purpose. It opens Gmail, Outlook or WhatsApp with the message ready, and you press send. Messages come from your real address, which gets far more replies and keeps your domain out of spam folders."],
    ["Where do the businesses come from?", "Google Maps listings (names, websites, phone numbers, reviews), with OpenStreetMap as a backup. Emails come from the business's own website during the audit, or from a CSV you import."],
    ["Who is it for?", "Freelancers and small agencies who sell websites, apps, marketing or software to businesses — anywhere in the world."],
    ["Can I cancel?", "Any time, from the Billing page. You keep your plan until the end of the period you paid for, then drop to Free. Your data stays."],
    ["Is my list private?", "Yes. Every workspace is separate, and nobody else can see your prospects, notes or templates."],
  ];

  return (
    <div className="min-h-[100svh] bg-page">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-page/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/welcome" className="flex items-center gap-2.5"><Logo /><span className="display text-[1.35rem]">Leadget</span></Link>
          <nav className="hidden items-center gap-7 text-[13.5px] text-muted md:flex">
            <a href="#features" className="hover:text-ink">Features</a><a href="#how" className="hover:text-ink">How it works</a><a href="#pricing" className="hover:text-ink">Pricing</a><a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/signin" className={btn("ghost", "md")}>Sign in</Link>
            <Link href="/signup" className={btn("primary", "md")}>Start free</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pb-20 pt-16 sm:pt-24">
        <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl text-center animate-rise">
          <p className="mb-5 inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1 text-[12px] text-muted shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> For freelancers and agencies who build for businesses
          </p>
          <h1 className="display text-[clamp(2.6rem,1.6rem+4.4vw,5rem)] leading-[1.02]">
            Find the businesses that <em className="italic text-brand">need what you build.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-[54ch] text-[16px] leading-relaxed text-muted">
            Search any city for real estate agencies, pharmacies, clinics or law firms. See who has no website — or a broken one — and pitch them with an angle that actually fits.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={btn("accent", "lg")}>Start free — no card <IconArrowRight /></Link>
            <a href="#how" className={btn("secondary", "lg")}>See how it works</a>
          </div>
        </div>
        <div className="relative mt-16 animate-rise [animation-delay:120ms]"><Preview /></div>
      </section>

      <section className="border-y border-line bg-surface px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted">
          <span className="mono">Built for</span>
          {PLAYBOOKS.filter((p) => p.id !== "other").slice(0, 9).map((p) => <span key={p.id}>{p.emoji} {p.label}</span>)}
        </div>
      </section>

      <section id="features" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mono">What it does</p>
          <h2 className="display mt-2 max-w-2xl text-[clamp(2rem,1.4rem+2vw,3rem)]">Everything between &ldquo;who should I pitch?&rdquo; and a signed client.</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-ink">{f.icon}</span>
                <h3 className="mt-5 text-[16px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="bg-rail px-5 py-24 text-rail-ink">
        <div className="mx-auto max-w-6xl">
          <p className="mono !text-rail-muted">How it works</p>
          <h2 className="display mt-2 text-[clamp(2rem,1.4rem+2vw,3rem)]">Ten minutes from a city name to your first pitch.</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              ["Search a market", "Real estate in Dubai Marina. Pharmacies in Houston. Law firms in London. Pick the cities, get the list."],
              ["Let it do the homework", "Leadget audits every website, pulls emails and phone numbers off them, and scores each lead."],
              ["Pitch with an angle", "Take the suggested angle, fill in the one thing only you know, send from your own inbox. It books the follow-up."],
            ].map(([t, b], i) => (
              <li key={t} className="border-t border-rail-line pt-6">
                <span className="display text-[3rem] leading-none text-accent">{i + 1}</span>
                <h3 className="mt-4 text-[17px] font-semibold">{t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-rail-muted">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mono">The swipe file</p>
            <h2 className="display mt-2 text-[clamp(2rem,1.4rem+2vw,3rem)]">Openers that don&apos;t read like cold email.</h2>
            <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-muted">
              Every angle comes filled in for the lead you&apos;re writing to — their name, their city, the exact problem on their website. The parts only you can write are highlighted, and Leadget won&apos;t let you send them blank.
            </p>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {SWIPE_CATEGORIES.map((c) => <span key={c} className="rounded-pill border border-brand/25 bg-brand/[.06] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wide text-brand">{c}</span>)}
            </div>
          </div>
          <div className="card p-6 shadow-lift">
            <p className="flex items-center gap-2 text-[12px] text-muted"><IconMail className="h-3.5 w-3.5" /> Lead with the audit · <span className="text-brand">suggested</span></p>
            <p className="mt-3 text-[13px]"><span className="text-muted">Subject:</span> <span className="font-medium">a quick thing on Harbour Point&apos;s website</span></p>
            <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed">
              <p>Hi Tunde,</p>
              <p>I had a look at Harbour Point&apos;s website this morning. On a phone it shows the desktop page shrunk down — and most of your visitors are on phones.</p>
              <p>It&apos;s a fixable problem, and usually not a big one. I help real estate businesses with <mark className="rounded-sm bg-warning/15 px-0.5 text-warning">[your offer]</mark>.</p>
              <p>Happy to send over the three changes I&apos;d make, no charge. Want them?</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-line bg-surface px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="mono">Pricing</p>
            <h2 className="display mt-2 text-[clamp(2rem,1.4rem+2vw,3rem)]">Start free. Pay when it&apos;s paying you.</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className={`card relative flex flex-col p-7 ${p.id === "starter" ? "border-ink shadow-lift" : ""}`}>
                {p.id === "starter" && <span className="absolute -top-3 left-7 rounded-pill bg-accent px-3 py-1 text-[11px] font-semibold text-accent-ink">Most popular</span>}
                <h3 className="text-[16px] font-semibold">{p.name}</h3>
                <p className="mt-1 text-[13px] text-muted">{p.blurb}</p>
                <p className="mt-6"><span className="display num text-[2.8rem]">${p.price_usd}</span><span className="text-muted"> /month</span></p>
                <ul className="mt-6 flex-1 space-y-2.5 text-[13.5px]">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{f}</li>)}
                </ul>
                <Link href="/signup" className={btn(p.id === "starter" ? "accent" : "secondary", "md", "mt-7 w-full")}>{p.id === "free" ? "Start free" : `Start with ${p.name}`}</Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[12.5px] text-muted">Prices in USD. Pay by card or bank transfer through Paystack. Cancel any time.</p>
        </div>
      </section>

      <section id="faq" className="px-5 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="display text-center text-[clamp(2rem,1.4rem+2vw,3rem)]">Questions</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                  {q}<span className="text-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-rail px-8 py-16 text-center text-rail-ink">
          <div aria-hidden className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
          <h2 className="display relative text-[clamp(2rem,1.4rem+2vw,3.2rem)]">Your next client is on a map somewhere.</h2>
          <p className="relative mt-3 text-[15px] text-rail-muted">Go and find them.</p>
          <Link href="/signup" className={btn("accent", "lg", "relative mt-8")}>Start free <IconArrowRight /></Link>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-[12.5px] text-muted">
          <span className="flex items-center gap-2"><Logo className="h-5 w-5" /> © {new Date().getFullYear()} Leadget</span>
          <span className="flex gap-5"><Link href="/legal/terms" className="hover:text-ink">Terms</Link><Link href="/legal/privacy" className="hover:text-ink">Privacy</Link><Link href="/signin" className="hover:text-ink">Sign in</Link></span>
          <span className="text-[11.5px] text-faint">City data © GeoNames, CC-BY 4.0</span>
        </div>
      </footer>
    </div>
  );
}
