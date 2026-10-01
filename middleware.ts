import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

/**
 * Personal mode: with APP_PASSCODE set, every page needs the passcode cookie.
 * SaaS mode: refresh the Supabase session on every request, and send anyone
 * signed out to the landing page (for "/") or the sign-in page.
 */

const SAAS_PUBLIC = [/^\/(m|r)\//, /^\/api\/view/, /^\/welcome/, /^\/signin/, /^\/signup/, /^\/auth\//, /^\/api\/billing\/paystack/, /^\/legal/];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (process.env.APP_MODE === "saas") {
    let res = NextResponse.next({ request: req });
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (list: { name: string; value: string; options?: any }[]) => {
            list.forEach(({ name, value }) => req.cookies.set(name, value));
            res = NextResponse.next({ request: req });
            list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
          },
        },
      },
    );
    const { data } = await sb.auth.getUser();
    const signedIn = !!data.user;

    if (SAAS_PUBLIC.some((re) => re.test(pathname))) {
      if (signedIn && (pathname === "/signin" || pathname === "/signup")) return NextResponse.redirect(new URL("/", req.url));
      return res;
    }
    if (!signedIn) {
      const url = req.nextUrl.clone();
      url.pathname = pathname === "/" ? "/welcome" : "/signin";
      url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return res;
  }

  // Personal mode — the SaaS-only pages don't exist here.
  if (/^\/(welcome|signin|signup|billing)(\/|$)/.test(pathname)) return NextResponse.redirect(new URL("/", req.url));

  // Links you send prospects are public by design.
  if (/^\/(m|r)\/|^\/api\/view$/.test(pathname)) return NextResponse.next();

  const code = process.env.APP_PASSCODE;
  if (!code || pathname === "/login") return NextResponse.next();
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken(code))) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
