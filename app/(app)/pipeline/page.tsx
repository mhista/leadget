import { store } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { Kanban } from "@/components/Kanban";

export const metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [prospects, settings] = await Promise.all([(await store()).listProspects(), (await store()).getSettings()]);
  return (
    <>
      <PageHeader eyebrow="Pipeline" title="Every deal, by where it stands" description="Drag a card to move it. Values add up per column so you can see what's actually in play." />
      <Kanban prospects={prospects} currency={settings.currency} />
    </>
  );
}
