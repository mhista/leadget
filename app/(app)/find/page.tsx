import { PageHeader } from "@/components/ui";
import { FindLeads } from "@/components/FindLeads";
import { googleConfigured } from "@/lib/discover";
import { store } from "@/lib/store";

export const metadata = { title: "Find leads" };
export const dynamic = "force-dynamic";
// Audits, speed tests and multi-city searches can take up to a minute.
export const maxDuration = 60;

export default async function FindPage() {
  const s = await (await store()).getSettings();
  return (
    <>
      <PageHeader
        eyebrow="Find leads"
        title={<>Businesses that need <em className="italic text-brand">what you build</em></>}
        description="Pick an industry and a place. Leadget pulls real businesses from the map, flags the ones with no website, and can audit the rest before you write a word."
      />
      <FindLeads google={googleConfigured()} defaultIndustry={s.target_industries[0] ?? "real-estate"} defaultCountry={s.target_countries[0] ?? ""} />
    </>
  );
}
