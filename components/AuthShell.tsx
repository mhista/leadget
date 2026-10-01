import Link from "next/link";
import { Logo, IconCheck } from "@/components/icons";

/** Two-panel frame for sign-in and sign-up: the pitch on the left, the form on the right. */
export function AuthShell({ title, sub, children, footer }: { title: string; sub: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="grid min-h-[100svh] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-rail p-12 text-rail-ink lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.06]" style={{ backgroundImage: "radial-gradient(rgb(var(--rail-ink)) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <Link href="/welcome" className="relative flex items-center gap-2.5"><Logo /><span className="display text-[1.4rem]">Leadget</span></Link>
        <div className="relative max-w-md">
          <p className="display text-[2.6rem] leading-[1.05]">Find the businesses that need what you build.</p>
          <ul className="mt-8 space-y-3 text-[14px] text-rail-muted">
            {["Search any city for real estate, clinics, pharmacies, law firms…", "See exactly what's broken on their website", "Pitch with an angle that fits — and follow up on time"].map((t) => (
              <li key={t} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"><IconCheck className="h-3 w-3" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12px] text-rail-muted">Free to start. No card needed.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-rise">
          <Link href="/welcome" className="mb-10 flex items-center gap-2 lg:hidden"><Logo className="h-6 w-6" /><span className="display text-[1.2rem]">Leadget</span></Link>
          <h1 className="display text-[2rem]">{title}</h1>
          <p className="mt-1.5 text-[13.5px] text-muted">{sub}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-[13px] text-muted">{footer}</p>
        </div>
      </section>
    </main>
  );
}
