import { redirect } from "next/navigation";
import { store } from "@/lib/store";
import { DASHBOARD_URL } from "@/lib/mode";
import { PageHeader } from "@/components/ui";
import { InvoiceList } from "@/components/kymaa/InvoiceList";

export const metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  if (DASHBOARD_URL) redirect(`${DASHBOARD_URL}/invoices`); // invoices live in the Kymaa dashboard
  const st = await store();
  const [invoices, settings, prospects] = await Promise.all([st.listInvoices(), st.getSettings(), st.listProspects()]);
  const names = Object.fromEntries(prospects.map((p) => [p.id, p.name]));
  const missingBank = !settings.bank_name || !settings.account_number;
  return (
    <>
      <PageHeader eyebrow="Invoices" title="Get paid for the work you won"
        description="Kymaa-branded invoices with totals, VAT, deposits and balance worked out for you. Share a link or save a one-page A4 PDF." />
      <InvoiceList invoices={invoices} names={names} settings={settings} missingBank={missingBank} />
    </>
  );
}
