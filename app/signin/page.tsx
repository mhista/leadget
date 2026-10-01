import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignInForm } from "@/components/AuthForms";

export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <AuthShell title="Welcome back" sub="Pick up where you left off." footer={<>New here? <Link href="/signup" className="font-medium text-ink underline underline-offset-4">Create a free account</Link></>}>
      {error && <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{error === "link" ? "That link has expired or was already used. Try again." : "Couldn't sign in with Google. Try again."}</p>}
      <SignInForm next={next ?? "/"} google={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"} />
    </AuthShell>
  );
}
