"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions";
import { kymaaLogin } from "@/lib/kymaa-actions";
import { btn } from "@/components/ui";
import { IconLock } from "@/components/icons";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="rounded-xl border border-rail-line bg-white/[.03] p-6 backdrop-blur">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-2 block text-[12.5px] text-rail-muted">Passcode</span>
        <input name="passcode" type="password" autoFocus autoComplete="current-password"
          className="w-full rounded-md border border-rail-line bg-black/20 px-3 py-2.5 text-[14px] text-rail-ink outline-none focus:border-accent/60" />
      </label>
      {state?.error && <p role="alert" className="mt-2 text-[12.5px] text-[#F46E62]">{state.error}</p>}
      <button className={btn("accent", "md", "mt-4 w-full")} disabled={pending}><IconLock /> {pending ? "Checking…" : "Unlock"}</button>
    </form>
  );
}

/** Kymaa mode: the same email and password as the Kymaa dashboard. */
export function KymaaLoginForm({ next, denied, dashboard }: { next: string; denied: boolean; dashboard: string }) {
  const [state, action, pending] = useActionState(kymaaLogin, {});
  const field = "w-full rounded-md border border-rail-line bg-black/20 px-3 py-2.5 text-[14px] text-rail-ink outline-none focus:border-accent/60";
  return (
    <form action={action} className="rounded-xl border border-rail-line bg-white/[.03] p-6 backdrop-blur">
      <input type="hidden" name="next" value={next} />
      <p className="mb-4 text-[13px] text-rail-muted">Sign in with your Kymaa dashboard account.</p>
      {denied && <p role="alert" className="mb-3 text-[12.5px] text-[#F46E62]">That account can’t work leads. Ask an owner for the Sales, Editor or Owner role.</p>}
      <label className="block">
        <span className="mb-2 block text-[12.5px] text-rail-muted">Email</span>
        <input name="email" type="email" autoFocus autoComplete="email" className={field} />
      </label>
      <label className="mt-3 block">
        <span className="mb-2 block text-[12.5px] text-rail-muted">Password</span>
        <input name="password" type="password" autoComplete="current-password" className={field} />
      </label>
      {state?.error && <p role="alert" className="mt-2 text-[12.5px] text-[#F46E62]">{state.error}</p>}
      <button className={btn("accent", "md", "mt-4 w-full")} disabled={pending}><IconLock /> {pending ? "Signing in…" : "Sign in"}</button>
      {dashboard && <a href={`${dashboard}/login`} className="mt-3 block text-center text-[12.5px] text-rail-muted hover:text-rail-ink">Forgot your password? Reset it on the dashboard</a>}
    </form>
  );
}
