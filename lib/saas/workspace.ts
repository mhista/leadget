import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { admin, authClient } from "./supabase";
import { PLAN, period, type Meter, type PlanId } from "./plans";
import { DEFAULT_SETTINGS } from "@/lib/types";

/**
 * Who is signed in, and which workspace they're working in.
 *
 * A workspace is created the first time someone signs in, so there is no
 * separate onboarding step to forget. Everyone is the owner of their own
 * workspace for now; memberships already exist so teams can come later
 * without a migration.
 */

export type Workspace = {
  id: string;
  name: string;
  plan: PlanId;
  plan_expires_at: string | null;
  paystack_subscription: string | null;
  paystack_email_token: string | null;
};

export type Session = { user: { id: string; email: string; name: string }; workspace: Workspace; plan: PlanId };

/** The plan that's actually in force — a paid plan lapses to Free when its period ends. */
export function effectivePlan(ws: Pick<Workspace, "plan" | "plan_expires_at">): PlanId {
  if (ws.plan === "free") return "free";
  if (!ws.plan_expires_at || new Date(ws.plan_expires_at).getTime() < Date.now()) return "free";
  return ws.plan;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const sb = await authClient();
  const { data } = await sb.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || u.email?.split("@")[0] || "";
  const workspace = await ensureWorkspace(u.id, u.email ?? "", name);
  return { user: { id: u.id, email: u.email ?? "", name }, workspace, plan: effectivePlan(workspace) };
});

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/signin");
  return s;
}

async function ensureWorkspace(userId: string, email: string, name: string): Promise<Workspace> {
  const db = admin();
  const { data: m } = await db.from("memberships").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
  if (m?.workspace_id) {
    const { data: ws, error } = await db.from("workspaces").select("*").eq("id", m.workspace_id).single();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return ws as Workspace;
  }
  const id = crypto.randomUUID();
  const ws = { id, name: name ? `${name}'s workspace` : "My workspace", owner_id: userId, plan: "free", plan_expires_at: null };
  const r1 = await db.from("workspaces").insert(ws);
  if (r1.error) throw new Error(`Supabase: ${r1.error.message}`);
  await db.from("memberships").insert({ workspace_id: id, user_id: userId, role: "owner" });
  await db.from("settings").upsert({ workspace_id: id, data: { ...DEFAULT_SETTINGS, your_name: name, sender_email: email } });
  return { ...ws, plan: "free", paystack_subscription: null, paystack_email_token: null } as Workspace;
}

/* ── Credits ─────────────────────────────────────────────────────────── */

export type Usage = Record<Meter, number>;

export async function getUsage(workspaceId: string): Promise<Usage> {
  const { data } = await admin().from("usage").select("searches,audits,ai").eq("workspace_id", workspaceId).eq("period", period()).maybeSingle();
  return { searches: data?.searches ?? 0, audits: data?.audits ?? 0, ai: data?.ai ?? 0 };
}

export class LimitError extends Error {}

/**
 * Check there are credits left, then spend them. Throws a LimitError with a
 * message the person can act on. The increment is one SQL function call, so
 * two tabs can't both spend the last credit.
 */
export async function spend(s: Session, meter: Meter, n = 1) {
  const limit = PLAN[s.plan].limits[meter];
  const { data, error } = await admin().rpc("spend_credits", {
    ws: s.workspace.id, per: period(), meter, amount: n, cap: limit,
  });
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (data === false) {
    const what = { searches: "lead searches", audits: "website audits", ai: "AI pitches" }[meter];
    throw new LimitError(
      s.plan === "pro"
        ? `You've used all ${limit} ${what} for this month. They reset on the 1st.`
        : `You've used your ${limit} ${what} for this month. Upgrade on the Billing page for more.`,
    );
  }
}
