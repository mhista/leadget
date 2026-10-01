import { notFound } from "next/navigation";
import { SAAS } from "@/lib/mode";
import { PageHeader, Notice } from "@/components/ui";
import { BillingPlans } from "@/components/BillingPlans";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  if (!SAAS) notFound();
  const { requireSession, getUsage } = await import("@/lib/saas/workspace");
  const { PLANS, PLAN, METER_LABEL } = await import("@/lib/saas/plans");
  const s = await requireSession();
  const usage = await getUsage(s.workspace.id);
  const plan = PLAN[s.plan];
  const { paid } = await searchParams;
  const resets = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  return (
    <>
      <PageHeader eyebrow="Billing" title={<>You&apos;re on <em className="italic text-brand">{plan.name}</em></>}
        description={s.plan !== "free" && s.workspace.plan_expires_at
          ? `Renews around ${new Date(s.workspace.plan_expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. Credits reset on ${resets}.`
          : `Credits reset on ${resets}.`} />
      {paid && <div className="mb-6"><Notice tone="success">Payment received — thank you. Your plan updates as soon as Paystack confirms it, usually within a minute. Refresh if it hasn&apos;t yet.</Notice></div>}

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        {(["searches", "audits", "ai"] as const).map((k) => {
          const lim = plan.limits[k];
          const used = usage[k];
          const pct = Math.min(100, (used / Math.max(1, lim)) * 100);
          return (
            <div key={k} className="card p-5 animate-rise">
              <p className="mono">{METER_LABEL[k]}</p>
              <p className="display num mt-2 text-[2rem] leading-none">{Math.max(0, lim - used).toLocaleString()}<span className="text-[1rem] text-muted"> left</span></p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-page-alt"><div className={`h-full rounded-full ${pct > 85 ? "bg-danger" : "bg-brand"}`} style={{ width: `${pct}%` }} /></div>
              <p className="mt-2 text-[12px] text-muted">{used.toLocaleString()} of {lim.toLocaleString()} used this month</p>
            </div>
          );
        })}
      </section>

      <BillingPlans plans={PLANS} current={s.plan} canManage={!!s.workspace.paystack_subscription} />
    </>
  );
}
