import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/icons";

export const metadata = { title: "Unlock" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-[100svh] place-items-center bg-rail px-4">
      <div aria-hidden className="pointer-events-none fixed left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative w-full max-w-sm animate-rise text-rail-ink">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Logo className="h-9 w-9" />
          <span className="display text-[1.8rem]">Leadget</span>
        </div>
        <LoginForm next={next ?? "/"} />
      </div>
    </main>
  );
}
