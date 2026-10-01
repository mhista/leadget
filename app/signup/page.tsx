import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignUpForm } from "@/components/AuthForms";

export const metadata = { title: "Create your account" };

export default function SignUp() {
  return (
    <AuthShell title="Start finding clients" sub="Free plan, no card. Your first search takes about a minute." footer={<>Already have an account? <Link href="/signin" className="font-medium text-ink underline underline-offset-4">Sign in</Link></>}>
      <SignUpForm google={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"} />
    </AuthShell>
  );
}
