import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/saas/supabase";
import { PLANS } from "@/lib/saas/plans";

/**
 * Paystack webhook. Set the URL in Paystack → Settings → API Keys & Webhooks:
 *   https://YOUR-DOMAIN/api/billing/paystack
 *
 * Every event is signed with your secret key (HMAC-SHA512); anything that
 * doesn't verify is refused. A successful charge extends the plan by one
 * billing period (+ 3 days' grace), so a renewal that fails simply lets the
 * plan lapse back to Free — no separate cancellation bookkeeping to get wrong.
 */
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });

  const raw = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const event = JSON.parse(raw) as { event: string; data: any };
  const d = event.data ?? {};
  const db = admin();

  // Which plan did they buy? Paystack sends the plan code; map it back.
  const planCode: string | undefined = d.plan?.plan_code ?? d.plan_object?.plan_code ?? (typeof d.plan === "string" ? d.plan : undefined);
  const plan = PLANS.find((p) => p.paystackEnv && process.env[p.paystackEnv] === planCode) ?? PLANS.find((p) => p.id === d.metadata?.plan);

  // Which workspace? Metadata on the first charge; the customer email afterwards.
  let workspaceId: string | undefined = d.metadata?.workspace_id;
  const customerCode: string | undefined = d.customer?.customer_code;
  if (!workspaceId && customerCode) {
    const { data } = await db.from("workspaces").select("id").eq("paystack_customer", customerCode).maybeSingle();
    workspaceId = data?.id;
  }
  if (!workspaceId) return NextResponse.json({ ok: true, ignored: "no workspace" });

  if (event.event === "charge.success" && plan && plan.id !== "free") {
    const days = d.plan?.interval === "annually" ? 368 : 34;
    await db.from("workspaces").update({
      plan: plan.id,
      plan_expires_at: new Date(Date.now() + days * 86400000).toISOString(),
      ...(customerCode ? { paystack_customer: customerCode } : {}),
    }).eq("id", workspaceId);
  }

  if (event.event === "subscription.create") {
    await db.from("workspaces").update({
      paystack_subscription: d.subscription_code ?? null,
      paystack_email_token: d.email_token ?? null,
      ...(customerCode ? { paystack_customer: customerCode } : {}),
    }).eq("id", workspaceId);
  }

  return NextResponse.json({ ok: true });
}
