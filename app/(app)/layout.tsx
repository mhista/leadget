import { Shell, type ShellAccount } from "@/components/Shell";
import { store, storeKind } from "@/lib/store";
import { SAAS } from "@/lib/mode";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const prospects = await (await store()).listProspects().catch(() => []);
  const today = new Date().toISOString().slice(0, 10);
  const live = prospects.filter((p) => p.stage !== "won" && p.stage !== "lost");
  const due = live.filter((p) => p.next_follow_up && p.next_follow_up <= today).length;
  const threeDays = new Date(Date.now() - 3 * 86400000).toISOString();
  const opened = live.filter((p) => p.last_viewed_at && p.last_viewed_at > threeDays && (!p.last_contacted_at || p.last_viewed_at > p.last_contacted_at)).length;

  let account: ShellAccount | null = null;
  if (SAAS) {
    const { requireSession, getUsage } = await import("@/lib/saas/workspace");
    const { PLAN } = await import("@/lib/saas/plans");
    const s = await requireSession();
    const usage = await getUsage(s.workspace.id);
    account = { name: s.user.name, email: s.user.email, plan: PLAN[s.plan].name, usage, limits: PLAN[s.plan].limits };
  }

  return (
    <Shell counts={{ prospects: prospects.length, due, today: due + opened }} storage={storeKind()} locked={!!process.env.APP_PASSCODE} account={account}>
      {children}
    </Shell>
  );
}
