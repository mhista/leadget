import { notFound } from "next/navigation";
import { loadShared } from "@/lib/store/public";
import { reportFor } from "@/lib/kymaa/report";
import { KymaaReport } from "@/components/kymaa/KymaaReport";
import { ViewBeacon } from "@/components/ViewBeacon";
import { PreviewBar } from "@/components/PreviewBar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = await loadShared((await params).id);
  const brand = found?.s.business_name || "Kymaa";
  return {
    title: { absolute: found ? `Website check: ${found.p.name} — ${brand}` : "Website check" },
    robots: { index: false, follow: false },
    icons: { icon: "/brand/logo/kymaa-favicon.svg", apple: "/brand/logo/kymaa-app-icon-180.png" },
  };
}

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { id } = await params;
  const { preview } = await searchParams;
  const found = await loadShared(id);
  if (!found?.p.audit) notFound();
  const { p, s } = found;
  return (
    <>
      <KymaaReport d={reportFor(p, s)} speed={p.audit!.pagespeed} brand={s.business_name} site={s.website} page />
      <ViewBeacon id={id} kind="report" />
      {preview && <PreviewBar kind="report" name={p.name} backHref={`/prospects/${p.id}`} />}
      {preview && <div className="h-24 print:hidden" style={{ background: "#E9E6DD" }} />}
    </>
  );
}
