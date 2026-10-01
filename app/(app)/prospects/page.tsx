import { store } from "@/lib/store";
import { ProspectTable } from "@/components/ProspectTable";

export const metadata = { title: "Prospects" };
export const dynamic = "force-dynamic";
// Audits, speed tests and multi-city searches can take up to a minute.
export const maxDuration = 60;

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const st = await store();
  const [prospects, settings] = await Promise.all([st.listProspects(), st.getSettings()]);
  return (
    <ProspectTable
      prospects={prospects}
      currency={settings.currency}
      views={settings.saved_views ?? []}
      initial={{ stage: sp.stage, industry: sp.industry, sort: sp.sort, view: sp.view, add: sp.add === "1" }}
    />
  );
}
