import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { groqConfigured } from "@/lib/ai/groq";
import { scoreReasons } from "@/lib/score";
import { ProspectView } from "@/components/ProspectView";

export const dynamic = "force-dynamic";
// Audits, speed tests and multi-city searches can take up to a minute.
export const maxDuration = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await (await store()).getProspect((await params).id);
  return { title: p?.name ?? "Prospect" };
}

export default async function ProspectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ angle?: string }> }) {
  const { id } = await params;
  const { angle } = await searchParams;
  const st = await store();
  const [p, activities, settings, templates, invoices] = await Promise.all([st.getProspect(id), st.listActivities(id), st.getSettings(), st.listTemplates(), st.listInvoices(id)]);
  if (!p) notFound();
  return (
    <ProspectView
      p={p}
      activities={activities}
      invoices={invoices}
      settings={settings}
      templates={templates.filter((t) => !t.industry || t.industry === p.industry)}
      ai={groqConfigured()}
      reasons={scoreReasons(p)}
      touches={activities.filter((a) => ["email", "whatsapp", "call", "linkedin"].includes(a.type)).length}
      initialAngle={angle}
    />
  );
}
