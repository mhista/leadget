"use client";

import { useTransition } from "react";
import clsx from "clsx";
import { manageSubscription, startCheckout } from "@/lib/saas/actions";
import type { Plan, PlanId } from "@/lib/saas/plans";
import { btn } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { useToast } from "@/components/Toast";
import { IconCheck } from "@/components/icons";

export function BillingPlans({ plans, current, canManage }: { plans: Plan[]; current: PlanId; canManage: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const rank = (id: PlanId) => plans.findIndex((p) => p.id === id);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.id === current;
          const featured = p.id === "starter";
          return (
            <div key={p.id} className={clsx("card relative flex flex-col p-6 animate-rise", featured && "border-ink shadow-lift")}>
              {featured && <span className="absolute -top-3 left-6 rounded-pill bg-accent px-3 py-1 text-[11px] font-semibold text-accent-ink">Most popular</span>}
              <h3 className="text-[15px] font-semibold">{p.name}</h3>
              <p className="mt-1 text-[12.5px] text-muted">{p.blurb}</p>
              <p className="mt-5"><span className="display num text-[2.4rem]">${p.price_usd}</span><span className="text-[13px] text-muted"> /month</span></p>
              {p.price_ngn > 0 && <p className="text-[12px] text-faint">≈ ₦{p.price_ngn.toLocaleString()} — charged by Paystack</p>}
              <ul className="mt-5 flex-1 space-y-2 text-[13px]">
                {p.features.map((f) => <li key={f} className="flex gap-2"><IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{f}</li>)}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <span className={btn("secondary", "md", "w-full pointer-events-none")}>Current plan</span>
                ) : p.id === "free" ? (
                  canManage ? <button onClick={() => start(async () => { const r = await manageSubscription(); if (r?.error) toast(r.error, "error"); })} className={btn("ghost", "md", "w-full")}>Cancel paid plan</button> : null
                ) : (
                  <button disabled={pending} onClick={() => start(async () => { const r = await startCheckout(p.id); if (r?.error) toast(r.error, "error"); })}
                    className={btn(featured ? "accent" : "primary", "md", "w-full")}>
                    {pending && <Spinner />}{rank(p.id) > rank(current) ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {canManage && (
        <p className="mt-6 text-[12.5px] text-muted">
          Change card or cancel any time: <button onClick={() => start(async () => { const r = await manageSubscription(); if (r?.error) toast(r.error, "error"); })} className="text-ink underline underline-offset-2">manage subscription on Paystack</button>. Cancelling keeps your plan until the end of the period you&apos;ve paid for.
        </p>
      )}
    </>
  );
}
