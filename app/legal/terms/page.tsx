import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms of service" };

/* DRAFT — have a lawyer review before launch. */
export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="[date]">
      <p>These terms are an agreement between you and <mark>[legal business name]</mark> for use of Leadget.</p>
      <h2>Using Leadget</h2>
      <p>Leadget helps you research businesses and prepare outreach. You send messages yourself, from your own accounts. You agree not to use Leadget to send spam, to contact people who have asked you not to, or in any way that breaks the law where you or your recipients are — including anti-spam rules (such as CAN-SPAM and PECR) and data-protection law (such as the NDPA and GDPR).</p>
      <h2>Plans and payment</h2>
      <p>Paid plans are billed monthly in advance through Paystack and renew automatically until cancelled. Cancelling keeps your plan until the end of the paid period. Credits reset each calendar month and don&apos;t roll over. <mark>[Refund policy]</mark>.</p>
      <h2>Your content</h2>
      <p>What you put into Leadget is yours. We only use it to provide the service.</p>
      <h2>Availability</h2>
      <p>We work to keep Leadget running but don&apos;t guarantee it will be uninterrupted. Third-party data (maps, websites) may be incomplete or out of date.</p>
      <h2>Liability</h2>
      <p><mark>[Limitation of liability clause]</mark></p>
      <h2>Contact</h2>
      <p><mark>[support email]</mark></p>
    </LegalPage>
  );
}
