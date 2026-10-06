import { notFound, redirect } from "next/navigation";
import { DASHBOARD_URL } from "@/lib/mode";
import { store } from "@/lib/store";
import { InvoiceEditor } from "@/components/kymaa/InvoiceEditor";

export const metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (DASHBOARD_URL) redirect(`${DASHBOARD_URL}/invoices/${encodeURIComponent(id)}`);
  const st = await store();
  const [inv, settings, prospects] = await Promise.all([st.getInvoice(id), st.getSettings(), st.listProspects()]);
  if (!inv) notFound();
  const clients = prospects
    .filter((p) => ["won", "proposal", "meeting", "replied"].includes(p.stage) || p.id === inv.prospect_id)
    .map((p) => ({ id: p.id, name: p.name, email: p.email, contact: p.contact_name, address: p.address, city: p.city, country: p.country, deal: p.deal_value }));
  return <InvoiceEditor inv={inv} settings={settings} clients={clients} />;
}
