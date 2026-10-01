/**
 * Outbound links. Leadget never sends anything itself — it opens your own
 * Gmail, mail app or WhatsApp with the message filled in, and you press send.
 * That keeps every message coming from your real address (good for replies
 * and deliverability) and keeps you on the right side of anti-spam law.
 */

const DIAL: Record<string, string> = {
  nigeria: "234", ghana: "233", kenya: "254", "south africa": "27", rwanda: "250", egypt: "20", uganda: "256", tanzania: "255",
  "united kingdom": "44", uk: "44", ireland: "353", "united states": "1", usa: "1", canada: "1",
  germany: "49", netherlands: "31", france: "33", spain: "34", italy: "39",
  "united arab emirates": "971", uae: "971", "saudi arabia": "966", qatar: "974", india: "91", australia: "61",
};

/** Digits in international form, for wa.me. Local numbers starting 0 get the country code. */
export function waNumber(phone: string, country = "") {
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d.slice(1);
  if (d.startsWith("00")) return d.slice(2);
  const cc = DIAL[country.trim().toLowerCase()];
  if (cc && d.startsWith("0")) return cc + d.slice(1);
  return d;
}

export const gmailLink = (to: string, subject: string, body: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const outlookLink = (to: string, subject: string, body: string) =>
  `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const mailtoLink = (to: string, subject: string, body: string) =>
  `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const whatsappLink = (phone: string, country: string, text: string) =>
  `https://wa.me/${waNumber(phone, country)}?text=${encodeURIComponent(text)}`;

/** A LinkedIn people search for the decision-maker at this business. */
export const linkedinSearch = (business: string, role = "owner OR founder OR director OR partner OR manager") =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${business} ${role}`)}`;

/** Google search that often surfaces a contact email for the domain. */
export const emailHunt = (website: string, name: string) => {
  let domain = "";
  try { domain = new URL(website).hostname.replace(/^www\./, ""); } catch { /* none */ }
  return `https://www.google.com/search?q=${encodeURIComponent(domain ? `"@${domain}"` : `"${name}" email contact`)}`;
};
