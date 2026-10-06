"use server";
import { redirect } from "next/navigation";
import { authClient, admin } from "@/lib/saas/supabase";
import { LEAD_ROLES } from "@/lib/kymaa-auth";

/** Sign in with a Kymaa dashboard account. */
export async function kymaaLogin(_: unknown, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) return { error: "Enter your email and password." };
  const sb = await authClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "That email and password don’t match." };
  const { data: row } = await admin().from("admins").select("role,active").eq("user_id", data.user.id).maybeSingle();
  if (!row?.active || !(LEAD_ROLES as readonly string[]).includes(row.role)) {
    await sb.auth.signOut();
    return { error: "Your Kymaa account can’t work leads. Ask an owner to give you the Sales, Editor or Owner role." };
  }
  const next = String(form.get("next") || "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function kymaaLogout() {
  const sb = await authClient();
  await sb.auth.signOut();
  redirect("/login");
}
