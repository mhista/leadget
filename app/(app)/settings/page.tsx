import { store, storeKind } from "@/lib/store";
import { groqConfigured, model } from "@/lib/ai/groq";
import { googleConfigured } from "@/lib/discover";
import { PageHeader } from "@/components/ui";
import { SAAS } from "@/lib/mode";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await (await store()).getSettings();
  return (
    <>
      <PageHeader eyebrow="Settings" title="You, what you sell, and who you sell it to" description="Every pitch is written from this. The more specific the proof, the better the replies." />
      <SettingsForm
        settings={s}
        status={{
          ai: groqConfigured(), model: model(),
          google: googleConfigured(),
          storage: storeKind(),
          passcode: !!process.env.APP_PASSCODE,
          saas: SAAS,
        }}
      />
    </>
  );
}
