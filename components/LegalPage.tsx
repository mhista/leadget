import Link from "next/link";
import { Logo } from "@/components/icons";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-[100svh] bg-page px-5 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/welcome" className="mb-10 flex items-center gap-2"><Logo className="h-6 w-6" /><span className="display text-[1.2rem]">Leadget</span></Link>
        <h1 className="display text-[2.4rem]">{title}</h1>
        <p className="mt-2 text-[12.5px] text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-5 text-[14.5px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-[16px] [&_h2]:font-semibold [&_mark]:rounded-sm [&_mark]:bg-warning/15 [&_mark]:px-1 [&_mark]:text-warning">{children}</div>
      </div>
    </main>
  );
}
