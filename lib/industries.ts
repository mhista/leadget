/**
 * Industry playbooks.
 *
 * Each one is what a good salesperson would know before walking into that kind
 * of business: what keeps the owner up at night, what you can build that fixes
 * it, and the one-line hook. The pitch writer (AI or not) leans on these, so a
 * pharmacy gets a pitch about refills and a law firm gets one about enquiries —
 * not the same "I build websites" paragraph for everyone.
 *
 * `osm` and `google` are the search words that find these businesses on
 * OpenStreetMap and Google Maps.
 */

export type Playbook = {
  id: string;
  label: string;
  emoji: string;
  osm: string;
  google: string;
  pains: string[];
  offers: string[];
  hook: string;
  /** Typical first project, in USD, to seed a deal value. */
  typical_deal: number;
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "real-estate",
    label: "Real estate",
    emoji: "🏠",
    osm: "real estate agency",
    google: "real estate agency",
    pains: [
      "Listings live on WhatsApp and Instagram, so buyers can't browse or filter them",
      "Enquiries arrive in five places and the slow reply loses the deal",
      "No way to show a property properly before a viewing",
    ],
    offers: [
      "A listings website with search, filters and a WhatsApp button on every property",
      "A lead inbox that puts every enquiry in one place and follows up automatically",
      "Virtual tour and brochure pages you can send in one link",
    ],
    hook: "every listing searchable, every enquiry answered in minutes",
    typical_deal: 2500,
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    emoji: "💊",
    osm: "pharmacy",
    google: "pharmacy",
    pains: [
      "Customers call to ask if a drug is in stock",
      "Refill reminders are manual or don't happen",
      "Competing with delivery apps that take a large cut",
    ],
    offers: [
      "An order-and-delivery site or app under the pharmacy's own name",
      "Automated refill reminders by WhatsApp or SMS",
      "A simple stock checker customers can use before they travel",
    ],
    hook: "refills and orders that come to you, without an app taking a cut",
    typical_deal: 2000,
  },
  {
    id: "law",
    label: "Law firm",
    emoji: "⚖️",
    osm: "lawyer",
    google: "law firm",
    pains: [
      "The website looks older than the firm and doesn't say what they practise",
      "Enquiries come in with no detail, so every first call is triage",
      "No insights or articles, so the firm doesn't show up when people search",
    ],
    offers: [
      "A modern, credible site built around practice areas and partners",
      "An intake form that qualifies the matter before the first call",
      "A simple publishing setup for articles that bring in search traffic",
    ],
    hook: "a site that looks as senior as the partners and pre-qualifies every enquiry",
    typical_deal: 3000,
  },
  {
    id: "clinic",
    label: "Clinic & hospital",
    emoji: "🩺",
    osm: "clinic",
    google: "medical clinic",
    pains: [
      "Appointments are booked by phone, so the line is always busy",
      "No-shows cost them slots every week",
      "Patients can't find services, doctors or prices online",
    ],
    offers: [
      "Online booking with reminders that cut no-shows",
      "A clear services and doctors site that ranks locally",
      "A patient app for results, bookings and payments",
    ],
    hook: "bookings online, reminders automatic, fewer empty slots",
    typical_deal: 3500,
  },
  {
    id: "dental",
    label: "Dental",
    emoji: "🦷",
    osm: "dentist",
    google: "dentist",
    pains: ["Phone-only booking", "Recall visits slip", "Treatments and prices aren't online"],
    offers: ["Online booking and 6-month recall reminders", "A treatment and pricing site that ranks locally", "Before/after gallery that sells cosmetic work"],
    hook: "recall reminders that fill the calendar on their own",
    typical_deal: 2500,
  },
  {
    id: "restaurant",
    label: "Restaurant & café",
    emoji: "🍽️",
    osm: "restaurant",
    google: "restaurant",
    pains: ["Delivery apps take 20–30% of every order", "Menu is a PDF or a photo", "No way to take reservations or pre-orders"],
    offers: ["Direct ordering on their own site with no commission", "A mobile menu with photos that updates in seconds", "Reservations and pre-orders"],
    hook: "direct orders without the delivery-app commission",
    typical_deal: 1500,
  },
  {
    id: "hotel",
    label: "Hotel & short-let",
    emoji: "🏨",
    osm: "hotel",
    google: "hotel",
    pains: ["Booking sites take 15–25% commission", "No direct booking engine", "Photos and rooms aren't shown well"],
    offers: ["Direct booking website with payments", "Room pages that sell, with galleries and availability", "Guest messaging and upsells"],
    hook: "direct bookings that skip the 15–25% commission",
    typical_deal: 3000,
  },
  {
    id: "school",
    label: "School",
    emoji: "🎓",
    osm: "school",
    google: "private school",
    pains: ["Admissions are paper forms", "Parents chase results and fees by phone", "The website doesn't sell the school to new parents"],
    offers: ["Online admissions and fee payment", "A parent portal or app for results and notices", "A site that wins over parents choosing a school"],
    hook: "admissions and fees online, parents informed without phone calls",
    typical_deal: 3000,
  },
  {
    id: "logistics",
    label: "Logistics",
    emoji: "🚚",
    osm: "courier",
    google: "logistics company",
    pains: ["Customers call to ask where their package is", "Dispatch is run on WhatsApp groups", "Quotes are manual"],
    offers: ["Shipment tracking customers can check themselves", "A dispatch dashboard and rider app", "Instant quote calculator on the site"],
    hook: "tracking customers can check themselves, so the phone stops ringing",
    typical_deal: 4000,
  },
  {
    id: "salon",
    label: "Salon & spa",
    emoji: "💇",
    osm: "hairdresser",
    google: "beauty salon",
    pains: ["Bookings in DMs", "No-shows", "No deposits"],
    offers: ["Booking with deposits", "Reminders by WhatsApp", "A portfolio site that shows the work"],
    hook: "bookings with deposits, so no-shows stop costing money",
    typical_deal: 1000,
  },
  {
    id: "gym",
    label: "Gym & fitness",
    emoji: "🏋️",
    osm: "fitness centre",
    google: "gym",
    pains: ["Memberships tracked on paper or in Excel", "Renewals slip", "Class booking is chaotic"],
    offers: ["Membership and renewal system with payments", "Class booking app", "Automated renewal reminders"],
    hook: "renewals that collect themselves",
    typical_deal: 2000,
  },
  {
    id: "retail",
    label: "Retail & e-commerce",
    emoji: "🛍️",
    osm: "shop",
    google: "store",
    pains: ["Sales only happen in-store or in DMs", "Inventory isn't online", "No repeat-customer marketing"],
    offers: ["An online store with local delivery and payments", "Inventory synced between shop and site", "Customer list with WhatsApp/email campaigns"],
    hook: "a store that sells while the shop is closed",
    typical_deal: 2500,
  },
  {
    id: "finance",
    label: "Finance & fintech",
    emoji: "💳",
    osm: "bank",
    google: "microfinance",
    pains: ["Onboarding is paper-heavy", "Customers can't self-serve", "Internal tools are spreadsheets"],
    offers: ["Digital onboarding and KYC flows", "A customer app or portal", "Internal dashboards replacing spreadsheets"],
    hook: "onboarding in minutes instead of branch visits",
    typical_deal: 8000,
  },
  {
    id: "construction",
    label: "Construction & property dev",
    emoji: "🏗️",
    osm: "construction company",
    google: "construction company",
    pains: ["Projects aren't showcased", "Off-plan sales are run on brochures", "Site progress updates are manual"],
    offers: ["A portfolio site that wins tenders", "Off-plan sales pages with payment plans", "Client progress portal with photo updates"],
    hook: "off-plan units that sell from a link",
    typical_deal: 4000,
  },
  {
    id: "church",
    label: "Church & NGO",
    emoji: "⛪",
    osm: "place of worship",
    google: "church",
    pains: ["Giving is cash-only", "Events and sermons aren't online", "Members aren't reachable in one place"],
    offers: ["Online giving", "Events, sermons and media site", "A member app with notices"],
    hook: "online giving and a home for every sermon",
    typical_deal: 1500,
  },
  {
    id: "startup",
    label: "Startup",
    emoji: "🚀",
    osm: "office",
    google: "startup",
    pains: ["Need an MVP fast", "Mobile app on both stores without two teams", "Internal team is stretched"],
    offers: ["Flutter MVP on iOS and Android from one codebase", "Contract development to extend the team", "Landing page and waitlist"],
    hook: "an MVP on both app stores from one codebase",
    typical_deal: 6000,
  },
  {
    id: "other",
    label: "Other",
    emoji: "🏢",
    osm: "",
    google: "",
    pains: ["Customers can't find or trust them online", "Manual processes that eat staff time"],
    offers: ["A modern website", "Automation of a manual process"],
    hook: "more customers online and fewer hours lost to admin",
    typical_deal: 1500,
  },
];

export const PLAYBOOK = Object.fromEntries(PLAYBOOKS.map((p) => [p.id, p])) as Record<string, Playbook>;

export function playbook(id: string | undefined | null): Playbook {
  return (id && PLAYBOOK[id]) || PLAYBOOK.other;
}

export function industryLabel(id: string) {
  return PLAYBOOK[id]?.label ?? (id || "—");
}

/** Countries people most often target, first, then everyone else via free text. */
export const COMMON_COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Rwanda", "Egypt",
  "United Kingdom", "United States", "Canada", "Ireland", "Germany", "Netherlands",
  "United Arab Emirates", "Saudi Arabia", "Qatar", "India", "Australia",
];
