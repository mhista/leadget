"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions";
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
