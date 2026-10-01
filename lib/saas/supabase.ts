import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Two Supabase clients:
 *  - authClient(): acts as the signed-in person (anon key + their session
 *    cookie). Used only for auth — who is this?
 *  - admin(): the service-role key, server-only, for data. Every data query
 *    goes through lib/store/supabase.ts, which pins it to one workspace_id,
 *    and RLS policies back that up for anything using the anon key.
 */

export const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

export async function authClient() {
  const jar = await cookies();
  return createServerClient(supabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list: { name: string; value: string; options?: any }[]) => {
        try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* called from a Server Component — middleware refreshes the session instead */ }
      },
    },
  });
}

let adminClient: SupabaseClient | null = null;
export function admin() {
  if (!adminClient) {
    adminClient = createClient(supabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  }
  return adminClient;
}
