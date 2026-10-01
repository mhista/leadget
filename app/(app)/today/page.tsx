import { store } from "@/lib/store";
import { groqConfigured } from "@/lib/ai/groq";
import { TodayQueue, type QueueItem } from "@/components/TodayQueue";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";
// Audits, speed tests and multi-city searches can take up to a minute.
export const maxDuration = 60;

const OUTREACH = new Set(["email", "whatsapp", "call", "linkedin"]);

/**
 * Today's queue, in the order that makes money:
 *  1. People who opened something you sent since your last touch
 *  2. Follow-ups that are due
 *  3. Your best uncontacted leads, enough to reach the daily goal
 */
export default async function TodayPage() {
  const st = await store();
  const [prospects, activities, settings, templates] = await Promise.all([st.listProspects(), st.listActivities(undefined, 20000), st.getSettings(), st.listTemplates()]);
  const today = new Date().toISOString().slice(0, 10);

  const touches: Record<string, number> = {};
  let sentToday = 0;
  for (const a of activities) {
    if (!OUTREACH.has(a.type)) continue;
    touches[a.prospect_id] = (touches[a.prospect_id] ?? 0) + 1;
    if (a.created_at.slice(0, 10) === today) sentToday++;
  }

  const active = prospects.filter((p) => !["won", "lost"].includes(p.stage));
  const touchedToday = (p: (typeof prospects)[number]) => p.last_contacted_at?.slice(0, 10) === today;
  const seen = new Set<string>();
  const items: QueueItem[] = [];
  const push = (p: (typeof prospects)[number], reason: QueueItem["reason"], label: string) => {
    if (seen.has(p.id) || touchedToday(p)) return;
    seen.add(p.id);
    items.push({ id: p.id, reason, label, touches: touches[p.id] ?? 0 });
  };

  const threeDays = Date.now() - 3 * 86400000;
  active
    .filter((p) => p.last_viewed_at && new Date(p.last_viewed_at).getTime() > threeDays && (!p.last_contacted_at || p.last_viewed_at > p.last_contacted_at))
    .sort((a, b) => b.last_viewed_at!.localeCompare(a.last_viewed_at!))
    .forEach((p) => push(p, "opened", p.mockup ? "Opened your mock-up" : "Opened your report"));

  active
    .filter((p) => p.next_follow_up && p.next_follow_up <= today)
    .sort((a, b) => a.next_follow_up!.localeCompare(b.next_follow_up!))
    .forEach((p) => push(p, "due", `Follow-up #${(touches[p.id] ?? 0) + 1}${p.next_follow_up! < today ? " · overdue" : ""}`));

  const goal = settings.daily_goal || 10;
  const room = Math.max(5, goal - sentToday - items.length);
  active
    .filter((p) => (p.stage === "new" || p.stage === "researching") && !p.last_contacted_at)
    .sort((a, b) => b.score - a.score)
    .slice(0, room + 10) // a few spares for the ones you skip
    .forEach((p) => push(p, "new", "First message"));

  return (
    <TodayQueue
      items={items}
      prospects={prospects.filter((p) => seen.has(p.id))}
      settings={settings}
      templates={templates}
      ai={groqConfigured()}
      sentToday={sentToday}
      goal={goal}
    />
  );
}
