import Link from "next/link";
import { store } from "@/lib/store";
import { OPEN_STAGES, STAGES, STAGE_META, type Activity, type Prospect } from "@/lib/types";
import { industryLabel, PLAYBOOK } from "@/lib/industries";
import { Card, CardHeader, LinkButton, ScoreRing, StagePill, ago, dueLabel, money } from "@/components/ui";
import { Favicon } from "@/components/Favicon";
import {
  IconEye, IconArrowRight, IconCheck, IconChat, IconClock, IconGlobe, IconMail, IconNote, IconPhone, IconLinkedin, IconSearch, IconSparkle, IconTarget, IconZap,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const OUTREACH = new Set(["email", "whatsapp", "call", "linkedin"]);

export default async function Overview() {
  const st = await store();
  const [prospects, activities, settings] = await Promise.all([st.listProspects(), st.listActivities(undefined, 1000), st.getSettings()]);
  const cur = settings.currency || "USD";
  const today = new Date().toISOString().slice(0, 10);

  const byId = new Map(prospects.map((p) => [p.id, p]));
  const outreach = activities.filter((a) => OUTREACH.has(a.type));
  const todayCount = outreach.filter((a) => a.created_at.slice(0, 10) === today).length;
  const weekAgo = Date.now() - 7 * 86400000;
  const weekCount = outreach.filter((a) => new Date(a.created_at).getTime() > weekAgo).length;

  const contacted = prospects.filter((p) => p.last_contacted_at || ["replied", "meeting", "proposal", "won"].includes(p.stage));
  const responded = prospects.filter((p) => ["replied", "meeting", "proposal", "won"].includes(p.stage));
  const replyRate = contacted.length ? Math.round((responded.length / contacted.length) * 100) : null;
  const openValue = prospects.filter((p) => OPEN_STAGES.includes(p.stage)).reduce((n, p) => n + (p.deal_value ?? 0), 0);
  const wonValue = prospects.filter((p) => p.stage === "won").reduce((n, p) => n + (p.deal_value ?? 0), 0);

  const due = prospects
    .filter((p) => p.next_follow_up && p.next_follow_up <= today && p.stage !== "won" && p.stage !== "lost")
    .sort((a, b) => a.next_follow_up!.localeCompare(b.next_follow_up!));
  const hot = prospects
    .filter((p) => (p.stage === "new" || p.stage === "researching") && !p.last_contacted_at)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = settings.your_name.split(" ")[0];
  const goal = settings.daily_goal || 10;

  // 14-day outreach bars
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString("en-GB", { weekday: "narrow" }), n: outreach.filter((a) => a.created_at.slice(0, 10) === key).length };
  });
  const maxDay = Math.max(goal, ...days.map((d) => d.n));

  // Industry mix
  const byIndustry = Object.entries(
    prospects.reduce<Record<string, number>>((m, p) => ((m[p.industry] = (m[p.industry] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const setup = [
    { done: !!settings.your_name && settings.services.length > 0, label: "Tell Leadget who you are and what you sell", href: "/settings" },
    { done: prospects.length > 0, label: "Find your first 20 businesses", href: "/find" },
    { done: prospects.some((p) => p.audit), label: "Audit a website to find what to fix", href: "/prospects" },
    { done: outreach.length > 0, label: "Send your first pitch", href: hot[0] ? `/prospects/${hot[0].id}` : "/prospects" },
  ];
  const setupLeft = setup.filter((s) => !s.done).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-rail px-6 py-7 text-rail-ink sm:px-8 sm:py-9 animate-rise">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-full w-1/2 opacity-[.07]"
          style={{ backgroundImage: "radial-gradient(rgb(var(--rail-ink)) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mono !text-rail-muted">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="display mt-2 text-[clamp(2rem,1.4rem+2.2vw,3.1rem)]">
              {greet}{first ? `, ${first}` : ""}.
            </h1>
            <p className="mt-2 max-w-[52ch] text-[14px] text-rail-muted">
              {due.length
                ? <>You have <span className="text-accent">{due.length} follow-up{due.length === 1 ? "" : "s"}</span> due and {hot.length ? `${hot.length} strong lead${hot.length === 1 ? "" : "s"} waiting for a first message` : "no new leads queued"}.</>
                : hot.length
                  ? <>Nothing overdue. {hot.length} strong lead{hot.length === 1 ? " is" : "s are"} waiting for a first message.</>
                  : <>Clean slate. Go and find some businesses that need what you build.</>}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="mono !text-rail-muted">Today&apos;s outreach</p>
              <p className="display num mt-1 text-[2.6rem] leading-none">
                {todayCount}<span className="text-[1.4rem] text-rail-muted"> / {goal}</span>
              </p>
            </div>
            <GoalRing value={todayCount} goal={goal} />
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <LinkButton href="/today" variant="accent"><IconTarget /> Start today&apos;s queue</LinkButton>
          <LinkButton href="/find" variant="secondary" className="!border-white/15 !bg-white/5 !text-rail-ink hover:!bg-white/10"><IconSearch /> Find leads</LinkButton>
          {due.length > 0 && <LinkButton href="/follow-ups" variant="secondary" className="!border-white/15 !bg-white/5 !text-rail-ink hover:!bg-white/10"><IconClock /> Work follow-ups</LinkButton>}
          {hot[0] && <LinkButton href={`/prospects/${hot[0].id}`} variant="secondary" className="!border-white/15 !bg-white/5 !text-rail-ink hover:!bg-white/10"><IconSparkle /> Pitch the top lead</LinkButton>}
        </div>
      </section>

      {/* Setup */}
      {setupLeft > 0 && (
        <Card className="animate-rise p-5 [animation-delay:60ms]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold">Get set up <span className="font-normal text-muted">· {setup.length - setupLeft} of {setup.length} done</span></h2>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-page-alt">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((setup.length - setupLeft) / setup.length) * 100}%` }} />
            </div>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {setup.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className={`group flex h-full items-start gap-3 rounded-lg border p-3.5 transition-colors ${s.done ? "border-line bg-sunken text-muted" : "border-line hover:border-ink/30 hover:bg-page-alt"}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${s.done ? "bg-success text-white" : "bg-page-alt text-ink ring-1 ring-line-strong"}`}>
                    {s.done ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={`text-[13px] leading-snug ${s.done ? "line-through decoration-faint" : ""}`}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Prospects" value={prospects.length.toLocaleString()} sub={`${prospects.filter((p) => p.stage === "new").length} not looked at yet`} icon={<IconTarget />} delay={0} />
        <Kpi label="Outreach this week" value={String(weekCount)} sub={`Goal ${goal * 5} a week`} icon={<IconZap />} delay={1} />
        <Kpi label="Reply rate" value={replyRate == null ? "—" : `${replyRate}%`} sub={`${responded.length} of ${contacted.length} contacted`} icon={<IconChat />} delay={2} />
        <Kpi label="Open pipeline" value={money(openValue, cur)} sub={wonValue ? `${money(wonValue, cur)} won` : "Nothing won yet — soon"} icon={<IconSparkle />} delay={3} accent />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {/* Hot leads */}
        <Card className="overflow-hidden">
          <CardHeader title="Strongest leads to pitch next" sub="Highest score, not contacted yet" action={<Link href="/prospects?sort=score" className="text-[12.5px] text-muted hover:text-ink">All prospects →</Link>} />
          {hot.length ? (
            <ul className="divide-y divide-line">
              {hot.map((p) => <LeadRow key={p.id} p={p} />)}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-[13px] text-muted">
              No uncontacted leads. <Link href="/find" className="text-ink underline decoration-line-strong underline-offset-4">Find some →</Link>
            </div>
          )}
        </Card>

        {/* Due */}
        <Card className="overflow-hidden">
          <CardHeader title="Follow-ups due" sub="Most deals close on the 2nd–5th touch" action={<Link href="/follow-ups" className="text-[12.5px] text-muted hover:text-ink">Open →</Link>} />
          {due.length ? (
            <ul className="divide-y divide-line">
              {due.slice(0, 6).map((p) => {
                const d = dueLabel(p.next_follow_up)!;
                return (
                  <li key={p.id}>
                    <Link href={`/prospects/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sunken">
                      <Favicon website={p.website} name={p.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{p.name}</p>
                        <p className="truncate text-[12px] text-muted">Last touch {ago(p.last_contacted_at)}</p>
                      </div>
                      <span className={`text-[12px] font-medium ${d.tone === "danger" ? "text-danger" : "text-warning"}`}>{d.text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-[13px] text-muted">Nothing due. Nice.</div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Funnel */}
        <Card className="p-5 lg:col-span-1">
          <h2 className="text-[13.5px] font-semibold">Pipeline</h2>
          <p className="text-[12px] text-muted">Where every prospect sits</p>
          <div className="mt-5 space-y-2.5">
            {STAGES.map((s) => {
              const n = prospects.filter((p) => p.stage === s).length;
              const pct = prospects.length ? (n / prospects.length) * 100 : 0;
              return (
                <Link key={s} href={`/prospects?stage=${s}`} className="group grid grid-cols-[84px_1fr_32px] items-center gap-3 text-[12.5px]">
                  <span className="text-muted group-hover:text-ink">{STAGE_META[s].label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-page-alt">
                    <span className="block h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, n ? 3 : 0)}%`, background: STAGE_META[s].hue }} />
                  </span>
                  <span className="num text-right font-medium">{n}</span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Activity bars */}
        <Card className="p-5">
          <h2 className="text-[13.5px] font-semibold">Outreach, last 14 days</h2>
          <p className="text-[12px] text-muted">Dashed line is your daily goal ({goal})</p>
          <div className="relative mt-5 flex h-[150px] items-end gap-1.5">
            <div className="absolute inset-x-0 border-t border-dashed border-line-strong" style={{ bottom: `${(goal / maxDay) * 100}%` }} />
            {days.map((d) => (
              <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
                <div
                  className={`w-full rounded-t-[4px] transition-all duration-700 ${d.n >= goal ? "bg-brand" : d.n ? "bg-ink/70" : "bg-page-alt"}`}
                  style={{ height: `${Math.max((d.n / maxDay) * 100, 3)}%` }}
                  title={`${d.key}: ${d.n}`}
                />
                <span className="mt-1.5 text-center text-[10px] text-faint">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Industry mix */}
        <Card className="p-5">
          <h2 className="text-[13.5px] font-semibold">By industry</h2>
          <p className="text-[12px] text-muted">Where your list is concentrated</p>
          {byIndustry.length ? (
            <ul className="mt-4 space-y-2">
              {byIndustry.map(([id, n]) => (
                <li key={id}>
                  <Link href={`/prospects?industry=${id}`} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-[13px] hover:bg-page-alt">
                    <span className="text-[16px]">{PLAYBOOK[id]?.emoji ?? "🏢"}</span>
                    <span className="flex-1">{industryLabel(id)}</span>
                    <span className="num text-muted">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-6 text-[13px] text-muted">Nothing yet.</p>}
        </Card>
      </div>

      {/* Activity feed */}
      <Card className="overflow-hidden">
        <CardHeader title="Recent activity" />
        {activities.length ? (
          <ul className="divide-y divide-line">
            {activities.slice(0, 10).map((a) => <FeedRow key={a.id} a={a} p={byId.get(a.prospect_id)} />)}
          </ul>
        ) : <p className="px-5 py-8 text-[13px] text-muted">Your activity will show up here.</p>}
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub, icon, delay, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; delay: number; accent?: boolean }) {
  return (
    <div className="card relative overflow-hidden p-4 sm:p-5 animate-rise" style={{ animationDelay: `${80 + delay * 60}ms` }}>
      {accent && <div aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent/25 blur-2xl" />}
      <div className="relative flex items-center justify-between">
        <p className="mono">{label}</p>
        <span className="text-faint">{icon}</span>
      </div>
      <p className="display num relative mt-3 text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-none">{value}</p>
      <p className="relative mt-2 truncate text-[12px] text-muted">{sub}</p>
    </div>
  );
}

function GoalRing({ value, goal }: { value: number; goal: number }) {
  const pct = Math.min(1, value / Math.max(goal, 1));
  const r = 30, c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" className="-rotate-90" aria-hidden>
      <circle cx="38" cy="38" r={r} fill="none" stroke="rgb(255 255 255 / .1)" strokeWidth="7" />
      <circle cx="38" cy="38" r={r} fill="none" stroke="rgb(var(--accent))" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)" }} />
    </svg>
  );
}

function LeadRow({ p }: { p: Prospect }) {
  const top = p.audit?.issues?.[0];
  return (
    <li>
      <Link href={`/prospects/${p.id}`} className="group flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-sunken">
        <Favicon website={p.website} name={p.name} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13.5px] font-medium">{p.name}</p>
            <StagePill stage={p.stage} className="hidden sm:inline-flex" />
          </div>
          <p className="truncate text-[12px] text-muted">
            {industryLabel(p.industry)}{p.city ? ` · ${p.city}` : ""}{" · "}
            {!p.website ? <span className="text-warning">No website</span> : top ? top.title : p.audit ? "Site looks fine" : "Not audited"}
          </p>
        </div>
        <ScoreRing score={p.score} />
        <IconArrowRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
    </li>
  );
}

const FEED_ICON: Record<string, React.ReactNode> = {
  email: <IconMail className="h-3.5 w-3.5" />, whatsapp: <IconChat className="h-3.5 w-3.5" />, call: <IconPhone className="h-3.5 w-3.5" />,
  linkedin: <IconLinkedin className="h-3.5 w-3.5" />, note: <IconNote className="h-3.5 w-3.5" />, audit: <IconGlobe className="h-3.5 w-3.5" />,
  stage: <IconArrowRight className="h-3.5 w-3.5" />, created: <IconSparkle className="h-3.5 w-3.5" />, viewed: <IconEye className="h-3.5 w-3.5" />,
};

function FeedRow({ a, p }: { a: Activity; p?: Prospect }) {
  return (
    <li className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-page-alt text-muted">{FEED_ICON[a.type]}</span>
      <p className="min-w-0 flex-1 truncate">
        {p ? <Link href={`/prospects/${p.id}`} className="font-medium hover:underline">{p.name}</Link> : <span className="text-muted">Deleted prospect</span>}
        <span className="text-muted"> — {a.body.split("\n")[0]}</span>
      </p>
      <span className="shrink-0 text-[12px] text-faint">{ago(a.created_at)}</span>
    </li>
  );
}
