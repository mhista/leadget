import { notFound, redirect } from "next/navigation";
import { DASHBOARD_URL } from "@/lib/mode";
import { loadSharedInvoice } from "@/lib/store/public";
import { KymaaInvoice } from "@/components/kymaa/KymaaInvoice";
import { ViewBeacon } from "@/components/ViewBeacon";
import { PreviewBar } from "@/components/PreviewBar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const found = await loadSharedInvoice((await params).id);
  return {
    title: { absolute: found ? `Invoice ${found.inv.doc.number} — ${found.inv.doc.from.name || "Kymaa"}` : "Invoice" },
    robots: { index: false, follow: false },
    icons: { icon: "/brand/logo/kymaa-favicon.svg", apple: "/brand/logo/kymaa-app-icon-180.png" },
  };
}

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { id } = await params;
  const { preview } = await searchParams;
  // Links sent before invoices moved to the dashboard keep working.
  if (DASHBOARD_URL) redirect(`${DASHBOARD_URL}/i/${encodeURIComponent(id)}${preview ? "?preview=1" : ""}`);
  const found = await loadSharedInvoice(id);
  if (!found || found.inv.doc.status === "draft" && !preview) notFound();
  const { inv } = found;
  return (
    <>
      <KymaaInvoice d={inv.doc} page />
      <ViewBeacon id={id} kind="invoice" />
      {preview && <PreviewBar kind="invoice" name={inv.doc.number} backHref={`/invoices/${inv.id}`} />}
      {preview && <div className="h-24 print:hidden" style={{ background: "#E9E6DD" }} />}
    </>
  );
}
