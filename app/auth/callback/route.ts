import { NextResponse } from "next/server";
import { authClient } from "@/lib/saas/supabase";

/** Where Supabase sends people back after a magic link, confirmation or Google sign-in. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const sb = await authClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dest, url.origin));
  }
  return NextResponse.redirect(new URL("/signin?error=link", url.origin));
}
