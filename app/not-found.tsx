import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[100svh] place-items-center px-4 text-center">
      <div>
        <p className="mono">404</p>
        <h1 className="display mt-2 text-[2.4rem]">Nothing here.</h1>
        <p className="mt-2 text-[13.5px] text-muted">That prospect may have been deleted.</p>
        <Link href="/" className="mt-6 inline-block rounded-pill bg-ink px-5 py-2.5 text-[13px] text-page">Back to overview</Link>
      </div>
    </main>
  );
}
