import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy policy" };

/* DRAFT — have a lawyer review before launch (NDPA 2023 in Nigeria; GDPR/UK GDPR if you serve EU/UK users). */
export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="[date]">
      <p>Leadget is operated by <mark>[legal business name, registration number]</mark>, <mark>[address]</mark> (“we”). This policy explains what we collect when you use Leadget and why.</p>
      <h2>What we collect</h2>
      <p>Your account details (name, email, password hash), your workspace content (the prospects, notes, templates and settings you add), usage counts for billing, and payment records from Paystack. We never see or store your card details.</p>
      <h2>Business data</h2>
      <p>Leadget shows publicly listed business information (such as names, websites, phone numbers and reviews) from Google Maps and OpenStreetMap, and details published on a business&apos;s own website. You are responsible for how you use contact details you save, including complying with anti-spam and data-protection law where you and your recipients are.</p>
      <h2>How we use it</h2>
      <p>To run the service, keep your account secure, bill you, and answer support requests. We don&apos;t sell your data or use your workspace content to train AI models.</p>
      <h2>Processors</h2>
      <p>Supabase (hosting and database), Vercel (hosting), Paystack (payments), Groq (AI pitch writing — the prospect details needed for a pitch are sent when you ask for one), Google (Places search).</p>
      <h2>Your rights</h2>
      <p>You can export or delete your data at any time, or ask us to, at <mark>[support email]</mark>. Deleting your account removes your workspace within <mark>[30]</mark> days.</p>
    </LegalPage>
  );
}
