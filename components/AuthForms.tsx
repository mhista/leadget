"use client";

import { useActionState, useState } from "react";
import { signIn, signInWithGoogle, signUp } from "@/lib/saas/actions";
import { btn, inputCls, Field, Notice } from "@/components/ui";
import { Spinner } from "@/components/controls";
import { IconMail } from "@/components/icons";

function GoogleButton() {
  return (
    <form action={signInWithGoogle}>
      <button className={btn("secondary", "lg", "w-full")}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"/></svg>
        Continue with Google
      </button>
    </form>
  );
}

const Or = () => <div className="my-5 flex items-center gap-3 text-[11.5px] text-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>;

export function SignInForm({ next, google }: { next: string; google: boolean }) {
  const [state, action, pending] = useActionState(signIn, {});
  const [magic, setMagic] = useState(false);
  if (state.sent) return <Notice tone="success">Check your inbox — we sent a sign-in link. It expires in an hour.</Notice>;
  return (
    <>
      {google && <><GoogleButton /><Or /></>}
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email"><input name="email" type="email" required autoComplete="email" className={inputCls} /></Field>
        {!magic && <Field label="Password"><input name="password" type="password" required autoComplete="current-password" className={inputCls} /></Field>}
        {state.error && <p role="alert" className="text-[12.5px] text-danger">{state.error}</p>}
        <button className={btn("primary", "lg", "w-full")} disabled={pending}>{pending && <Spinner />}{magic ? <><IconMail /> Email me a sign-in link</> : "Sign in"}</button>
        <button type="button" onClick={() => setMagic(!magic)} className="w-full text-center text-[12.5px] text-muted hover:text-ink">
          {magic ? "Use a password instead" : "Forgot it? Email me a sign-in link"}
        </button>
      </form>
    </>
  );
}

export function SignUpForm({ google }: { google: boolean }) {
  const [state, action, pending] = useActionState(signUp, {});
  if (state.sent) return <Notice tone="success">Almost there — confirm your email with the link we just sent, and you'll land straight in Leadget.</Notice>;
  return (
    <>
      {google && <><GoogleButton /><Or /></>}
      <form action={action} className="space-y-4">
        <Field label="Your name"><input name="name" required autoComplete="name" className={inputCls} /></Field>
        <Field label="Work email"><input name="email" type="email" required autoComplete="email" className={inputCls} /></Field>
        <Field label="Password" hint="At least 8 characters."><input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} /></Field>
        {state.error && <p role="alert" className="text-[12.5px] text-danger">{state.error}</p>}
        <button className={btn("accent", "lg", "w-full")} disabled={pending}>{pending && <Spinner />}Create free account</button>
        <p className="text-center text-[11.5px] text-faint">By signing up you agree to the <a href="/legal/terms" className="underline">Terms</a> and <a href="/legal/privacy" className="underline">Privacy policy</a>.</p>
      </form>
    </>
  );
}
