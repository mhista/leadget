"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "./supabase";
import { requireSession } from "./workspace";
import { PLAN, type PlanId } from "./plans";

/**
 * Accounts and billing. Only reachable in SaaS mode (the pages that call
 * these don't exist in the personal nav, and each action checks).
 */

type State = { error?: string; sent?: boolean };

async function origin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

const safeNext = (n: FormDataEntryValue | null) => {
  const s = String(n ?? "/");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function signIn(_: State, form: FormData): Promise<State> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const sb = await authClient();
  if (!password) {
    const { error } = await sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}` },
    });
    if (error) return { error: error.message };
    return { sent: true };
  }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message === "Invalid login credentials" ? "That email and password don't match." : error.message };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: State, form: FormData): Promise<State> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for the password." };
  const sb = await authClient();
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: name }, emailRedirectTo: `${await origin()}/auth/callback?next=/settings` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { sent: true }; // email confirmation is on
  redirect("/settings");
}

export async function signInWithGoogle() {
  const sb = await authClient();
  const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${await origin()}/auth/callback` } });
  if (error || !data.url) redirect("/signin?error=google");
  redirect(data.url);
}

export async function signOut() {
  const sb = await authClient();
  await sb.auth.signOut();
  redirect("/welcome");
}

/* ── Paystack ────────────────────────────────────────────────────────── */

const PAYSTACK = "https://api.paystack.co";

async function paystack(path: string, init?: RequestInit) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Payments aren't set up on this server yet.");
  const res = await fetch(`${PAYSTACK}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status === false) throw new Error(body.message || `Paystack returned ${res.status}.`);
  return body.data;
}

/** Start a subscription: Paystack's hosted checkout, then back to /billing. */
export async function startCheckout(planId: PlanId): Promise<{ error: string }> {
  let url: string;
  try {
    const s = await requireSession();
    const plan = PLAN[planId];
    const code = plan.paystackEnv ? process.env[plan.paystackEnv] : undefined;
    if (!code) return { error: "That plan isn't available for purchase yet." };
    const data = await paystack("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: s.user.email,
        amount: plan.price_ngn * 100, // Paystack uses the plan's own amount; this is a fallback
        plan: code,
        callback_url: `${await origin()}/billing?paid=1`,
        metadata: { workspace_id: s.workspace.id, plan: plan.id },
      }),
    });
    url = data.authorization_url;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't start checkout." };
  }
  redirect(url);
}

/** Paystack's own page for changing card or cancelling. */
export async function manageSubscription(): Promise<{ error: string }> {
  let url: string;
  try {
    const s = await requireSession();
    if (!s.workspace.paystack_subscription) return { error: "There's no active subscription to manage." };
    const data = await paystack(`/subscription/${s.workspace.paystack_subscription}/manage/link`);
    url = data.link;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't open subscription settings." };
  }
  redirect(url);
}
