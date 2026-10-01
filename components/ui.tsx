import clsx from "clsx";
import Link from "next/link";
import { STAGE_META, type Stage } from "@/lib/types";
import { scoreBand } from "@/lib/score";

/* ── Buttons ─────────────────────────────────────────────────────────── */

const btnBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium transition-all duration-200 ease-entrance disabled:pointer-events-none disabled:opacity-45 active:scale-[.98]";

export const BTN = {
  primary: "bg-ink text-page hover:bg-ink/85 shadow-soft",
  accent: "bg-accent text-accent-ink hover:brightness-95 shadow-soft",
  brand: "bg-brand text-brand-ink hover:brightness-110 shadow-soft",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink/40 hover:bg-page-alt",
  ghost: "text-muted hover:bg-page-alt hover:text-ink",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
};
export const SIZE = { sm: "h-8 px-3 text-[12.5px]", md: "h-10 px-4 text-[13px]", lg: "h-12 px-6 text-[14px]", icon: "h-9 w-9" };

export function btn(variant: keyof typeof BTN = "primary", size: keyof typeof SIZE = "md", extra?: string) {
  return clsx(btnBase, BTN[variant], SIZE[size], extra);
}

export function LinkButton({
  href, variant = "primary", size = "md", className, children, ...rest
}: { href: string; variant?: keyof typeof BTN; size?: keyof typeof SIZE; className?: string; children: React.ReactNode } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return <Link href={href} className={btn(variant, size, className)} {...rest}>{children}</Link>;
}

/* ── Page header ─────────────────────────────────────────────────────── */

export function PageHeader({
  eyebrow, title, description, action,
}: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div className="min-w-0">
        {eyebrow && <p className="mono mb-2">{eyebrow}</p>}
        <h1 className="display text-[clamp(1.75rem,1.3rem+1.6vw,2.6rem)] text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

/* ── Stage pill ──────────────────────────────────────────────────────── */

export function StagePill({ stage, className }: { stage: Stage; className?: string }) {
  const m = STAGE_META[stage];
  return (
    <span
      className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-[3px] text-[11.5px] font-medium", className)}
      style={{ background: `color-mix(in srgb, ${m.hue} 13%, transparent)`, color: m.hue }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.hue }} />
      {m.label}
    </span>
  );
}

/* ── Score ───────────────────────────────────────────────────────────── */

const toneColor = { hot: "rgb(var(--success))", warm: "rgb(var(--warning))", cold: "rgb(var(--faint))" };

export function ScoreRing({ score, size = 34 }: { score: number; size?: number }) {
  const band = scoreBand(score);
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} title={`Lead score ${score}/100 · ${band.label}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="3" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={toneColor[band.tone]} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <span className="num absolute text-[11px] font-semibold text-ink">{score}</span>
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const b = scoreBand(score);
  return (
    <span className="inline-flex items-center gap-1 rounded-pill px-2 py-[2px] text-[11px] font-medium" style={{ color: toneColor[b.tone], background: `color-mix(in srgb, ${toneColor[b.tone]} 12%, transparent)` }}>
      {b.label}
    </span>
  );
}

/* ── Fields ──────────────────────────────────────────────────────────── */

export const inputCls =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-faint outline-none transition-colors duration-200 hover:border-line-strong focus:border-ink/50 focus:ring-4 focus:ring-ink/5";

export const selectCls = clsx(inputCls, "select-chevron appearance-none pr-8");

export function Field({
  label, hint, children, className,
}: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-[12px] font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-faint">{hint}</span>}
    </label>
  );
}

/* ── Card & empty state ──────────────────────────────────────────────── */

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("card", className)} {...rest}>{children}</div>;
}

export function CardHeader({ title, action, sub }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <div>
        <h2 className="text-[13.5px] font-semibold text-ink">{title}</h2>
        {sub && <p className="text-[12px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({
  icon, title, body, action,
}: { icon?: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="grain rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
      {icon && <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg bg-surface text-ink shadow-soft">{icon}</div>}
      <h2 className="display text-[1.5rem] text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-[48ch] text-[13px] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "danger" | "success"; children: React.ReactNode }) {
  const c = { info: "--info", warning: "--warning", danger: "--danger", success: "--success" }[tone];
  return (
    <div className="rounded-md border-l-2 px-4 py-3 text-[12.5px] leading-relaxed"
      style={{ borderColor: `rgb(var(${c}))`, background: `rgb(var(${c}) / .08)`, color: "rgb(var(--ink))" }}>
      {children}
    </div>
  );
}

/* ── Formatting ──────────────────────────────────────────────────────── */

export function money(n: number | null | undefined, currency = "USD") {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0, notation: n >= 100_000 ? "compact" : "standard" }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}

export function ago(iso?: string | null) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dueLabel(date: string | null) {
  if (!date) return null;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const d = new Date(date);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `${-diff}d overdue`, tone: "danger" as const };
  if (diff === 0) return { text: "Today", tone: "warning" as const };
  if (diff === 1) return { text: "Tomorrow", tone: "info" as const };
  return { text: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), tone: "muted" as const };
}
