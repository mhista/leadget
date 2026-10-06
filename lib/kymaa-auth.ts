import "server-only";
import { cache } from "react";
import { authClient } from "@/lib/saas/supabase";
import { admin } from "@/lib/saas/supabase";

/**
 * Kymaa mode: who is signed in, and are they on the dashboard team?
 * Accounts and roles live in the Kymaa dashboard (People & roles). Owners,
 * editors and sales can work leads; viewers can't.
 */
export type KymaaMember = { id: string; email: string; name: string; role: "owner" | "editor" | "sales" | "viewer" };
export const LEAD_ROLES = ["owner", "editor", "sales"] as const;

export const kymaaMember = cache(async (): Promise<KymaaMember | null> => {
  const sb = await authClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: row } = await admin().from("admins").select("name,email,role,active").eq("user_id", data.user.id).maybeSingle();
  if (!row?.active) return null;
  return { id: data.user.id, email: row.email, name: row.name || row.email.split("@")[0], role: row.role };
});

export async function kymaaUserId(): Promise<string | null> {
  try { return (await kymaaMember())?.id ?? null; } catch { return null; }
}
