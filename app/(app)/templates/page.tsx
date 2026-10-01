import { store } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { Templates } from "@/components/Templates";
import { TEMPLATE_VARS } from "@/lib/render";

export const metadata = { title: "Templates" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await (await store()).listTemplates();
  return (
    <>
      <PageHeader eyebrow="Templates" title="Messages you've already got right" description="Save the openers and follow-ups that work. Fill-ins like {{company}} and {{issue}} are replaced with each prospect's details when you use them." />
      <Templates templates={templates} vars={TEMPLATE_VARS} />
    </>
  );
}
