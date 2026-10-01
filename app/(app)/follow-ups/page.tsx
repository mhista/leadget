import { store } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { FollowUps } from "@/components/FollowUps";

export const metadata = { title: "Follow-ups" };
export const dynamic = "force-dynamic";

const OUTREACH = new Set(["email", "whatsapp", "call", "linkedin"]);

export default async function FollowUpsPage() {
  const [prospects, activities] = await Promise.all([(await store()).listProspects(), (await store()).listActivities(undefined, 5000)]);
  const touches: Record<string, number> = {};
  const lastMsg: Record<string, string> = {};
  for (const a of activities) {
    if (!OUTREACH.has(a.type)) continue;
    touches[a.prospect_id] = (touches[a.prospect_id] ?? 0) + 1;
    if (!lastMsg[a.prospect_id]) lastMsg[a.prospect_id] = a.body.split("\n")[0];
  }
  const active = prospects.filter((p) => p.stage !== "won" && p.stage !== "lost");
  return (
    <>
      <PageHeader
        eyebrow="Follow-ups"
        title="The money is in the follow-up"
        description="Most replies come on the second to fifth touch, not the first. Work this list every day and nobody slips through."
      />
      <FollowUps prospects={active} touches={touches} lastMsg={lastMsg} />
    </>
  );
}
