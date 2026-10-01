import { notFound } from "next/navigation";
import { loadShared } from "@/lib/store/public";
import { MockupSite } from "@/components/MockupSite";
import { ViewBeacon } from "@/components/ViewBeacon";
import { PreviewBar } from "@/components/PreviewBar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = await loadShared((await params).id);
  return { title: { absolute: found ? `${found.p.name} — website preview` : "Preview" }, robots: { index: false, follow: false } };
}

export default async function MockupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { id } = await params;
  const { preview } = await searchParams;
  const found = await loadShared(id);
  if (!found?.p.mockup) notFound();
  return (
    <>
      <div id="capture"><MockupSite p={found.p} m={found.p.mockup} s={found.s} preview={!!preview} /></div>
      <ViewBeacon id={id} kind="mockup" />
      {preview && <PreviewBar kind="mockup" name={found.p.name} backHref={`/prospects/${found.p.id}`} />}
    </>
  );
}
