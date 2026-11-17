import type { Prospect } from "@/lib/types";
import { playbook } from "@/lib/industries";

/**
 * What we could sell this business, beyond "your website has problems".
 *
 * A business with a good website can still be a good lead: its niche runs on
 * apps and it has none, or its brand looks thrown together. Each opportunity
 * carries only things we actually saw (the audit, the listing, the playbook
 * for the niche), so the pitch can say them out loud.
 *
 *   website   no site, a broken one, or one with real problems
 *   app       nothing in the app stores, in a niche where customers use apps
 *   branding  no logo or icon, a free email address, a builder template, an
 *             old footer, a name that doesn't match: signs nobody owns the look
 *
 * `strength` (0–100) is how strong the case is; the best one leads the pitch.
 */

export type Service = "website" | "app" | "branding" | "software";

export type Opportunity = {
  service: Service;
  /** Short, for a chip or a list: "No app in a niche that runs on them". */
  title: string;
  /** The evidence, each one true and checkable. */
  why: string[];
  /** One sentence the pitch can open with. */
  pitch: string;
  /** What we'd offer, in their terms. */
  offer: string;
  strength: number;
};

export const SERVICE_LABEL: Record<Service, string> = { website: "Website", app: "Mobile app", branding: "Branding", software: "CMS & CRM" };

/**
 * What a CMS/CRM runs for each kind of business: the enquiries or records it
 * tracks, and the content it keeps current. Niches without an entry rarely
 * need one at the size we sell to.
 */
const SYSTEMS: Record<string, { crm: string; cms?: string; booking?: boolean }> = {
  "real-estate": { crm: "buyer and tenant enquiries, viewings and follow-ups", cms: "property listings" },
  law: { crm: "client enquiries, matters and follow-ups", cms: "articles and practice pages" },
  clinic: { crm: "patient enquiries, appointments and reminders", booking: true },
  dental: { crm: "patient bookings, recalls and reminders", booking: true },
  pharmacy: { crm: "customer orders, refills and deliveries" },
  restaurant: { crm: "reservations, orders and regulars", cms: "the menu and specials", booking: true },
  hotel: { crm: "direct bookings and guest requests", cms: "rooms, rates and offers", booking: true },
  school: { crm: "admissions enquiries and parent records", cms: "news, notices and the calendar" },
  logistics: { crm: "quotes, shipments and customer accounts" },
  salon: { crm: "bookings, clients and rebooking reminders", booking: true },
  gym: { crm: "memberships, trials and renewals", booking: true },
  construction: { crm: "quote requests, projects and clients", cms: "projects and case studies" },
  retail: { crm: "orders, customers and repeat buyers", cms: "the product catalogue" },
  finance: { crm: "applications, customers and follow-ups" },
  church: { crm: "members, giving and follow-ups", cms: "sermons, events and notices" },
};

const FREE_MAIL = /@(gmail|yahoo|ymail|hotmail|outlook|live|icloud|aol|proton|protonmail|mail|gmx|yandex)\./i;
const BUILDERS = new Set(["Wix", "Weebly", "Blogger", "GoDaddy Builder", "Squarespace", "Joomla"]);

export function opportunities(p: Prospect): Opportunity[] {
  const out: Opportunity[] = [];
  const pb = playbook(p.industry);
  const a = p.audit;
  const live = !!a && a.reachable && (!a.site_state || a.site_state === "ok" || a.site_state === "blocked");
  const busy = (p.reviews ?? 0) >= 200 ? 2 : (p.reviews ?? 0) >= 50 ? 1 : 0;
  const year = new Date().getFullYear();

  /* Website */
  if (!p.website) {
    out.push({
      service: "website", title: "No website", strength: 70 + busy * 5,
      why: [`No website on file${p.reviews ? `, with ${p.reviews} Google reviews` : ""}`],
      pitch: `${p.name} doesn't have a website${p.reviews ? `, even though ${p.reviews} people have reviewed you on Google` : ""}.`,
      offer: pb.offers[0],
    });
  } else if (a && !live) {
    out.push({
      service: "website", title: "Website isn't working", strength: 85,
      why: a.issues.slice(0, 3).map((i) => i.title),
      pitch: a.issues[0]?.pitch ?? `${p.name}'s website isn't loading.`,
      offer: pb.offers[0],
    });
  } else if (a && a.issues.length) {
    const high = a.issues.filter((i) => i.severity === "high");
    out.push({
      service: "website", title: `Website has ${a.issues.length} problem${a.issues.length === 1 ? "" : "s"}`,
      strength: Math.min(90, a.opportunity),
      why: [...high, ...a.issues.filter((i) => i.severity !== "high")].slice(0, 4).map((i) => i.title),
      pitch: (high[0] ?? a.issues[0]).pitch,
      offer: pb.offers[0],
    });
  }

  /* App: only where an app is genuinely useful, and only when we could see the site.
     Audits from before app links were looked for (no `favicon` field) can't say "no app". */
  const lookedForApps = !p.website || (!!a && a.favicon !== undefined);
  if (pb.app && (live || !p.website) && lookedForApps && !a?.apps) {
    const n = a?.niche;
    const peers = n && n.checked >= 4 && n.with_app >= 1 ? n : null;
    const why = [
      `${p.website ? "Their website doesn't link to an app" : "No app and no website"}`,
      `In ${pb.label.toLowerCase()}, ${pb.app.norm}`,
      ...(peers ? [`${peers.with_app} of ${peers.checked} ${pb.label.toLowerCase()} businesses checked in ${peers.where} have one`] : []),
      ...(busy ? [`Busy enough to use one: ${p.reviews} Google reviews`] : []),
    ];
    const strength = (pb.app.value === 2 ? 45 : 28) + busy * 10 + (peers ? Math.min(25, Math.round((peers.with_app / peers.checked) * 50)) : 0) - (p.website ? 0 : 15);
    out.push({
      service: "app", title: peers ? `No app, while ${peers.with_app} nearby rival${peers.with_app === 1 ? " has" : "s have"} one` : "No app of their own",
      why, strength: Math.max(10, Math.min(90, strength)),
      pitch: peers
        ? `${peers.with_app} of the ${peers.checked} ${pb.label.toLowerCase()} businesses I looked at in ${peers.where} have their own app, and ${p.name} doesn't yet.`
        : `More and more ${pb.label.toLowerCase()} customers expect an app: ${pb.app.norm}. ${p.name} doesn't have one yet.`,
      offer: "An app of their own on iOS and Android, built once for both stores",
    });
  }

  /* Branding: two or more signs that nobody owns the look. */
  const signs: string[] = [];
  const email = p.email || a?.emails[0] || "";
  if (email && FREE_MAIL.test(email)) signs.push(`Uses a free email address (${email.split("@")[1]}) instead of their own domain`);
  if (live && a && !a.logo) signs.push("No logo we could find on their website");
  if (live && a && a.favicon === false) signs.push("No site icon on the browser tab");
  if (live && a?.platform && BUILDERS.has(a.platform)) signs.push(`Website built from a ${a.platform} template`);
  if (live && a?.copyright_year && a.copyright_year <= year - 3) signs.push(`Website footer still says ${a.copyright_year}`);
  if (a?.site_state === "social_only") signs.push("Their web address just forwards to a social page");
  if (live && a && a.name_match === false) signs.push("Their website doesn't use the name customers know them by");
  if (live && a && (!a.title || /^(home|welcome|untitled|index)\b/i.test(a.title))) signs.push("Their homepage has no proper title");
  if (!p.website && (p.reviews ?? 0) >= 20) signs.push("Known locally but with no presence of their own online");
  if (signs.length >= 2) {
    out.push({
      service: "branding", title: signs.length >= 4 ? "Brand looks thrown together" : "Brand could look more established",
      why: signs.slice(0, 5), strength: Math.min(80, 18 + signs.length * 12 + busy * 5),
      pitch: `A few small things make ${p.name} look smaller than it is: ${signs.slice(0, 2).map((x) => x.charAt(0).toLowerCase() + x.slice(1)).join(", and ")}.`,
      offer: "A brand identity (logo, colours, type) used everywhere, from your website and email to your signage and socials",
    });
  }

  /* CMS & CRM: a busy business still running enquiries and content by hand. */
  const sys = SYSTEMS[pb.id];
  if (sys && busy) {
    const ops: string[] = [`${p.reviews} Google reviews: a steady flow of customers to keep track of`];
    if (live && a && !a.has_contact_form && !a.has_booking) ops.push(`Enquiries come in by ${a.has_whatsapp ? "WhatsApp" : "phone"} with no form or system to log them`);
    else if (!p.website) ops.push("No website, so every enquiry comes by phone or social messages");
    if (sys.booking && live && a && !a.has_booking) ops.push("No online booking: every appointment is arranged by hand");
    if (sys.cms && live && a?.copyright_year && a.copyright_year <= year - 2) ops.push(`Their ${sys.cms} look hard to keep current: the site footer says ${a.copyright_year}`);
    if (email && FREE_MAIL.test(email)) ops.push("Business email runs on a free address, so customer history lives in someone's inbox");
    if (ops.length >= 3) {
      out.push({
        service: "software", title: "Busy, but run by hand",
        why: ops.slice(0, 5),
        strength: Math.min(80, 20 + ops.length * 10 + (busy === 2 ? 10 : 0)),
        pitch: `${p.name} clearly has plenty of customers, but ${ops[1].charAt(0).toLowerCase() + ops[1].slice(1)}.`,
        offer: `A simple system for ${sys.crm}${sys.cms ? `, and for keeping ${sys.cms} up to date` : ""}, with AI that sorts enquiries, drafts replies and reminds you who to follow up`,
      });
    }
  }

  return out.sort((x, y) => y.strength - x.strength);
}

export const topOpportunity = (p: Prospect) => opportunities(p)[0] ?? null;
