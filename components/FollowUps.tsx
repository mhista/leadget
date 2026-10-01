"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { clearFollowUp, setStage, snooze } from "@/lib/actions";
import type { Prospect } from "@/lib/types";
import { industryLabel } from "@/lib/industries";
import { StagePill, btn, ago, dueLabel, Empty } from "@/components/ui";
import { Favicon } from "@/components/Favicon";
import { useToast } from "@/components/Toast";
import { IconCheck, IconClock, IconArrowRight, IconChat, IconSparkle } from "@/components/icons";
import { suggestAngles } from "@/lib/suggest";

export function FollowUps({ prospects, touches, lastMsg }: { prospects: Prospect[]; touches: Record<string, number>; lastMsg: Record<string, string> }) {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const quietCutoff = new Date(Date.now() - 10 * 86400000).toISOString();

  const withDate = prospects.filter((p) => p.next_follow_up).sort((a, b) => a.next_follow_up!.localeCompare(b.next_follow_up!));
  const overdue = withDate.filter((p) => p.next_follow_up! < today);
  const dueToday = withDate.filter((p) => p.next_follow_up === today);
  const upcoming = withDate.filter((p) => p.next_follow_up! > today && p.next_follow_up! <= in7);
  const quiet = prospects.filter((p) => !p.next_follow_up && p.last_contacted_at && p.last_contacted_at < quietCutoff && ["contacted", "replied", "meeting", "proposal"].includes(p.stage));

  if (!overdue.length && !dueToday.length && !upcoming.length && !quiet.length) {
    return <Empty icon={<IconClock className="h-5 w-5" />} title="Nothing to chase" body="When you log a message, Leadget books the next follow-up automatically. They'll line up here." action={<Link href="/prospects" className={btn("primary")}>Go to prospects</Link>} />;
  }

  return (
    <div className="space-y-6">
      <Group title="Overdue" tone="danger" list={overdue} touches={touches} lastMsg={lastMsg} />
      <Group title="Today" tone="warning" list={dueToday} touches={touches} lastMsg={lastMsg} />
      <Group title="Next 7 days" tone="muted" list={upcoming} touches={touches} lastMsg={lastMsg} />
      <Group title="Gone quiet" sub="Contacted over 10 days ago, no follow-up booked" tone="muted" list={quiet} touches={touches} lastMsg={lastMsg} />
    </div>
  );
}

function Group({ title, sub, tone, list, touches, lastMsg }: { title: string; sub?: string; tone: "danger" | "warning" | "muted"; list: Prospect[]; touches: Record<string, number>; lastMsg: Record<string, string> }) {
  if (!list.length) return null;
  return (
    <section className="card overflow-hidden animate-rise">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
        <span className={clsx("h-2 w-2 rounded-full", tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-faint")} />
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
        <span className="num text-[12px] text-faint">{list.length}</span>
        {sub && <span className="text-[12px] text-muted">· {sub}</span>}
      </div>
      <ul className="divide-y divide-line">{list.map((p) => <Row key={p.id} p={p} n={touches[p.id] ?? 0} last={lastMsg[p.id]} />)}</ul>
    </section>
  );
}

function Row({ p, n, last }: { p: Prospect; n: number; last?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();
  const due = dueLabel(p.next_follow_up);
  const next = suggestAngles(p, n, 1)[0];
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast((r as any).error, "error");
    toast(msg);
    router.refresh();
  });

  return (
    <li className={clsx("flex flex-wrap items-center gap-4 px-5 py-3.5 transition-opacity", busy && "opacity-50")}>
      <Link href={`/prospects/${p.id}`} className="flex min-w-[220px] flex-1 items-center gap-3">
        <Favicon website={p.website} name={p.name} size={36} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-[13.5px] font-medium">{p.name} <StagePill stage={p.stage} /></p>
          <p className="truncate text-[12px] text-muted">{industryLabel(p.industry)} · {n ? `${n} touch${n === 1 ? "" : "es"} so far, next is #${n + 1}` : "Not contacted yet"} · last {ago(p.last_contacted_at)}</p>
          {last && <p className="mt-0.5 max-w-[60ch] truncate text-[12px] text-faint">“{last.replace(/^(Email|WhatsApp|LinkedIn message)( \[[^\]]*\])?:\s*/, "")}”</p>}
        </div>
      </Link>
      {due && <span className={clsx("text-[12px] font-medium", due.tone === "danger" ? "text-danger" : due.tone === "warning" ? "text-warning" : "text-muted")}>{due.text}</span>}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => act(() => snooze(p.id, 2), "Pushed 2 days.")} className={btn("ghost", "sm")}>+2d</button>
        <button onClick={() => act(() => snooze(p.id, 7), "Pushed a week.")} className={btn("ghost", "sm")}>+7d</button>
        <button onClick={() => act(() => setStage(p.id, "replied"), "Marked as replied.")} className={btn("secondary", "sm")}><IconChat className="h-3.5 w-3.5" /> They replied</button>
        <button onClick={() => act(() => clearFollowUp(p.id), "Cleared.")} className={btn("ghost", "sm")} title="No more follow-ups"><IconCheck className="h-3.5 w-3.5" /></button>
        <Link href={`/prospects/${p.id}${next ? `?angle=${next.swipe.id}` : ""}`} title={next?.reason} className={btn("primary", "sm")}>
          {next ? <><IconSparkle className="h-3.5 w-3.5" /> {next.swipe.angle}</> : "Follow up"} <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  );
}
