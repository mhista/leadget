import type { Mockup, MockupService, Prospect } from "@/lib/types";

/**
 * The mock-up generator: a one-page website preview for a business that has
 * no site (or a bad one), built from what Leadget already knows about them.
 * It's the "free mock-up" angle made real — you send the link, not a promise.
 *
 * Copy is written per industry and uses only true facts (name, city, rating).
 * Anything you'd need to know to write it properly (prices, years in business)
 * is left out rather than invented. Everything is editable before you share.
 */

export type Layout = "editorial" | "visual" | "care" | "works";

export type Theme = {
  id: string;
  name: string;
  bg: string; surface: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string;
  hero: string; heroInk: string; heroMuted: string;
  display: string; // font family for headings
  body: string; // font family for text
  /** Google Fonts stylesheet for the two families. */
  fonts: string;
  /** How the page is put together: words first, pictures first, tasks first, or bold and industrial. */
  layout: Layout;
  /** Corner radius for photos and panels (px). */
  radius: number;
};

const gf = (q: string) => `https://fonts.googleapis.com/css2?${q}&display=swap`;

/**
 * Seven looks, each made for a kind of business rather than one template in
 * different colours: a law firm reads as considered and quiet, a restaurant
 * leads with the food, a clinic puts booking first, a logistics company
 * looks strong and practical.
 */
export const THEMES: Theme[] = [
  { id: "counsel", name: "Counsel (law, finance)", layout: "editorial", radius: 2,
    bg: "#F3F4F1", surface: "#FFFFFF", ink: "#142030", muted: "#5A6472", line: "#D8DCDE",
    accent: "#8A2E2A", accentInk: "#FFFFFF", hero: "#142030", heroInk: "#F3F4F1", heroMuted: "#A9B3C0",
    display: "'Newsreader', Georgia, serif", body: "'Public Sans', system-ui, sans-serif",
    fonts: gf("family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Public+Sans:wght@400;500;600") },
  { id: "estate", name: "Estate (property)", layout: "visual", radius: 6,
    bg: "#EDF0EC", surface: "#FFFFFF", ink: "#13261E", muted: "#55665D", line: "#D3DBD5",
    accent: "#A6762C", accentInk: "#FFFFFF", hero: "#16302A", heroInk: "#F1F3EE", heroMuted: "#A9BCB2",
    display: "'Schibsted Grotesk', system-ui, sans-serif", body: "'Schibsted Grotesk', system-ui, sans-serif",
    fonts: gf("family=Schibsted+Grotesk:wght@400;500;600;700") },
  { id: "care", name: "Care (clinic, dental, pharmacy)", layout: "care", radius: 18,
    bg: "#F1F7F7", surface: "#FFFFFF", ink: "#0D2A2E", muted: "#4F6B6E", line: "#D3E5E4",
    accent: "#0A7772", accentInk: "#FFFFFF", hero: "#DDEFED", heroInk: "#0D2A2E", heroMuted: "#3F5E61",
    display: "'Figtree', system-ui, sans-serif", body: "'Figtree', system-ui, sans-serif",
    fonts: gf("family=Figtree:wght@400;500;600;700;800") },
  { id: "table", name: "Table (food, hotels)", layout: "visual", radius: 4,
    bg: "#F5F0EA", surface: "#FFFDFB", ink: "#2A1A1D", muted: "#6E5A5C", line: "#E4D9D0",
    accent: "#C9822B", accentInk: "#21130F", hero: "#2B171C", heroInk: "#F7EEE4", heroMuted: "#C7B1A6",
    display: "'Fraunces', Georgia, serif", body: "'Karla', system-ui, sans-serif",
    fonts: gf("family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Karla:wght@400;500;600") },
  { id: "works", name: "Works (logistics, construction)", layout: "works", radius: 0,
    bg: "#F1F1EE", surface: "#FFFFFF", ink: "#1B1E21", muted: "#5D6268", line: "#D6D7D3",
    accent: "#E8631A", accentInk: "#FFFFFF", hero: "#1E2226", heroInk: "#F4F4F1", heroMuted: "#A7ADB3",
    display: "'Archivo', system-ui, sans-serif", body: "'Archivo', system-ui, sans-serif",
    fonts: gf("family=Archivo:wdth,wght@62..125,400;62..125,600;62..125,800") },
  { id: "studio", name: "Studio (salons, gyms, shops)", layout: "visual", radius: 28,
    bg: "#FAF7FB", surface: "#FFFFFF", ink: "#1D1424", muted: "#665B6E", line: "#E8DFEC",
    accent: "#B4235E", accentInk: "#FFFFFF", hero: "#241A2B", heroInk: "#FBF4F8", heroMuted: "#C3B1C9",
    display: "'Bricolage Grotesque', system-ui, sans-serif", body: "'Bricolage Grotesque', system-ui, sans-serif",
    fonts: gf("family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,700") },
  { id: "community", name: "Community (schools, churches)", layout: "editorial", radius: 10,
    bg: "#F4F6FB", surface: "#FFFFFF", ink: "#16223F", muted: "#566179", line: "#DAE0EC",
    accent: "#2B59D1", accentInk: "#FFFFFF", hero: "#16223F", heroInk: "#F4F6FB", heroMuted: "#A9B6D4",
    display: "'Literata', Georgia, serif", body: "'Atkinson Hyperlegible', system-ui, sans-serif",
    fonts: gf("family=Literata:opsz,wght@7..72,400;7..72,600&family=Atkinson+Hyperlegible:wght@400;700") },
];

/** Looks saved before the redesign map to their closest new one. */
const OLD: Record<string, string> = { forest: "estate", noir: "counsel", ocean: "care", mint: "care", ember: "table", plum: "community" };

export const THEME = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<string, Theme>;
export const themeFor = (id: string) => THEME[id] ?? THEME[OLD[id] ?? ""] ?? THEMES[0];

type Copy = { headline: string; tagline: string; about: string; services: MockupService[]; highlights: string[]; theme: string };

const COPY: Record<string, Copy> = {
  "real-estate": {
    theme: "estate",
    headline: "Find your next home in {city}",
    tagline: "Browse available properties, book a viewing, and talk to our team on WhatsApp, all in one place.",
    about: "{name} helps buyers, renters and investors find the right property in {city}, with honest advice at every step.",
    services: [
      { title: "Homes for sale", body: "Every available listing with photos, prices and locations you can filter in seconds." },
      { title: "Rentals", body: "Apartments and houses to rent, updated as soon as they come on the market." },
      { title: "Book a viewing", body: "Pick a time that suits you and we'll confirm straight away on WhatsApp." },
      { title: "Property management", body: "Landlords: we find tenants, collect rent and keep your property in shape." },
    ],
    highlights: ["Verified listings", "Viewings within 48 hours", "Replies on WhatsApp in minutes"],
  },
  pharmacy: {
    theme: "care",
    headline: "Your neighbourhood pharmacy in {city}",
    tagline: "Order your medicines online, check what's in stock, and get refill reminders, without the phone calls.",
    about: "{name} is a trusted pharmacy serving {city}, with licensed pharmacists ready to help with prescriptions and advice.",
    services: [
      { title: "Order online", body: "Send your prescription or shopping list and pick up or have it delivered." },
      { title: "Refill reminders", body: "We'll message you before your regular medicines run out." },
      { title: "Ask a pharmacist", body: "Quick, private advice on medicines, dosages and interactions." },
      { title: "Delivery", body: "Fast local delivery to your home or office." },
    ],
    highlights: ["Licensed pharmacists", "Genuine medicines", "Order on WhatsApp"],
  },
  law: {
    theme: "counsel",
    headline: "Clear legal advice. Serious representation.",
    tagline: "Tell us about your matter in two minutes and a lawyer will get back to you.",
    about: "{name} advises individuals and businesses in {city} with the care and discretion your matter deserves.",
    services: [
      { title: "Corporate & commercial", body: "Company formation, contracts, compliance and disputes." },
      { title: "Property & real estate", body: "Title checks, sales, leases and land matters." },
      { title: "Litigation", body: "Representation before courts and tribunals." },
      { title: "Family & private client", body: "Wills, estates and family matters, handled sensitively." },
    ],
    highlights: ["Confidential first consultation", "Clear fees before we start", "Responsive, senior attention"],
  },
  clinic: {
    theme: "care",
    headline: "Care you can book in minutes",
    tagline: "See a doctor at {name}. Book online, get reminders and skip the phone queue.",
    about: "{name} provides trusted medical care to families in {city}.",
    services: [
      { title: "General consultations", body: "Same-week appointments with experienced doctors." },
      { title: "Tests & diagnostics", body: "Lab tests and results you can check online." },
      { title: "Specialist care", body: "Referrals and specialist clinics under one roof." },
      { title: "Book online", body: "Choose a time, get a reminder, and arrive when it's your turn." },
    ],
    highlights: ["Book online 24/7", "Reminders by WhatsApp", "Experienced medical team"],
  },
  dental: {
    theme: "care",
    headline: "A healthier smile, booked in a minute",
    tagline: "Check-ups, cleaning and cosmetic treatments at {name}. Book online.",
    about: "{name} offers gentle, modern dental care in {city}.",
    services: [
      { title: "Check-ups & cleaning", body: "Keep your teeth healthy with regular visits and reminders." },
      { title: "Teeth whitening", body: "Professional whitening with results you can see." },
      { title: "Fillings & repairs", body: "Comfortable treatment for pain, chips and cavities." },
      { title: "Orthodontics", body: "Straighter teeth with braces or clear aligners." },
    ],
    highlights: ["Online booking", "Recall reminders", "Gentle, modern care"],
  },
  restaurant: {
    theme: "table",
    headline: "Order from {name}, direct",
    tagline: "See the full menu, order for pickup or delivery, and book a table, straight from us.",
    about: "{name} serves {city} with food made the way it should be.",
    services: [
      { title: "Full menu", body: "Every dish with photos and prices, always up to date." },
      { title: "Order online", body: "Pickup or delivery, ordered directly with no app in the middle." },
      { title: "Book a table", body: "Reserve for dinner, birthdays and groups." },
      { title: "Events & catering", body: "Let us feed your office, party or celebration." },
    ],
    highlights: ["Order direct", "Fresh every day", "Table bookings online"],
  },
  hotel: {
    theme: "table",
    headline: "Stay at {name}",
    tagline: "Book directly for the best rate. See the rooms, check availability and confirm in minutes.",
    about: "{name} welcomes guests to {city} with comfortable rooms and warm service.",
    services: [
      { title: "Rooms & suites", body: "See every room with photos, amenities and prices." },
      { title: "Book direct", body: "The best rate is always here, with instant confirmation." },
      { title: "Airport pickup", body: "Arrange your transfer when you book." },
      { title: "Events", body: "Meetings, weddings and celebrations." },
    ],
    highlights: ["Best rate when you book direct", "Instant confirmation", "Help on WhatsApp"],
  },
  school: {
    theme: "community",
    headline: "Where every child is known",
    tagline: "Discover {name}, book a school tour, and apply for admission online.",
    about: "{name} gives children in {city} a strong start, with caring teachers and a rounded education.",
    services: [
      { title: "Admissions", body: "Apply online and track your application." },
      { title: "Book a tour", body: "Visit the school and meet our teachers." },
      { title: "Parent portal", body: "Results, notices and fees in one place." },
      { title: "Clubs & activities", body: "Sports, arts and more beyond the classroom." },
    ],
    highlights: ["Online admissions", "Small class sizes", "Parents kept informed"],
  },
  logistics: {
    theme: "works",
    headline: "Deliveries you can track",
    tagline: "Get an instant quote, book a pickup, and follow your package every step of the way.",
    about: "{name} moves packages and freight across {city} and beyond, on time.",
    services: [
      { title: "Same-day delivery", body: "Fast deliveries across the city." },
      { title: "Track a shipment", body: "Live status, without calling anyone." },
      { title: "Instant quote", body: "Know the price before you book." },
      { title: "Business accounts", body: "Regular shipments with monthly billing." },
    ],
    highlights: ["Live tracking", "Instant quotes", "Reliable riders"],
  },
  salon: {
    theme: "studio",
    headline: "Look good, book easy",
    tagline: "See our work, pick a style and book your appointment at {name} online.",
    about: "{name} is {city}'s go-to for hair, beauty and a good time in the chair.",
    services: [
      { title: "Hair", body: "Cuts, braids, colour and styling." },
      { title: "Nails", body: "Manicures, pedicures and nail art." },
      { title: "Beauty", body: "Make-up, lashes and brows." },
      { title: "Book online", body: "Choose your stylist and time; we'll send a reminder." },
    ],
    highlights: ["Online booking", "Reminders", "See our portfolio"],
  },
  gym: {
    theme: "studio",
    headline: "Get stronger at {name}",
    tagline: "Join online, book classes, and keep your membership in your pocket.",
    about: "{name} is a friendly, well-equipped gym in {city}.",
    services: [
      { title: "Memberships", body: "Monthly and annual plans, joined online in minutes." },
      { title: "Classes", body: "Book your spot in the classes you love." },
      { title: "Personal training", body: "One-to-one coaching towards your goals." },
      { title: "Free trial", body: "Come and try us before you commit." },
    ],
    highlights: ["Join online", "Class booking", "Friendly coaches"],
  },
  retail: {
    theme: "studio",
    headline: "Shop {name} online",
    tagline: "Browse what's in store, order for delivery, and get updates on new arrivals.",
    about: "{name} brings great products to customers in {city}, now online too.",
    services: [
      { title: "Shop the range", body: "Everything in store, with prices and photos." },
      { title: "Delivery & pickup", body: "Order online, collect or have it delivered." },
      { title: "New arrivals", body: "Be first to know what's just landed." },
      { title: "Order on WhatsApp", body: "Prefer to chat? Order in a message." },
    ],
    highlights: ["Secure payments", "Fast delivery", "Real customer service"],
  },
  finance: {
    theme: "counsel",
    headline: "Banking that fits your day",
    tagline: "Open an account online, check your balance, and get help when you need it.",
    about: "{name} serves customers and businesses in {city}.",
    services: [
      { title: "Open an account", body: "Get started online in minutes." },
      { title: "Loans", body: "Clear terms and fast decisions." },
      { title: "Business banking", body: "Tools to run and grow your business." },
      { title: "Support", body: "Real people, when you need them." },
    ],
    highlights: ["Online onboarding", "Clear terms", "Responsive support"],
  },
  construction: {
    theme: "works",
    headline: "Built properly. Delivered on time.",
    tagline: "See our projects, reserve an off-plan unit, and follow progress online.",
    about: "{name} designs and builds in {city}, from homes to commercial developments.",
    services: [
      { title: "Our projects", body: "Completed and ongoing work, with photos and details." },
      { title: "Off-plan sales", body: "Reserve a unit and choose a payment plan." },
      { title: "Progress updates", body: "Clients see photo updates as the build goes up." },
      { title: "Request a quote", body: "Tell us about your project." },
    ],
    highlights: ["Proven projects", "Flexible payment plans", "Transparent progress"],
  },
  church: {
    theme: "community",
    headline: "Welcome home",
    tagline: "Service times, sermons and events at {name}. You can give online too.",
    about: "{name} is a community of faith in {city}. Everyone is welcome.",
    services: [
      { title: "Service times", body: "Join us this Sunday and through the week." },
      { title: "Sermons", body: "Watch and listen to past messages." },
      { title: "Events", body: "What's coming up in the community." },
      { title: "Give online", body: "Tithes and offerings, securely online." },
    ],
    highlights: ["Everyone welcome", "Sermons online", "Give online"],
  },
  startup: {
    theme: "studio",
    headline: "{name}",
    tagline: "[One line on what the product does and who it's for.]",
    about: "{name} is building [what] for [who].",
    services: [
      { title: "[Feature one]", body: "[What it does for the user.]" },
      { title: "[Feature two]", body: "[What it does for the user.]" },
      { title: "[Feature three]", body: "[What it does for the user.]" },
    ],
    highlights: ["iOS & Android", "Join the waitlist", "Built in {city}"],
  },
  other: {
    theme: "estate",
    headline: "{name}",
    tagline: "Everything you need to know about {name}, and a quick way to get in touch.",
    about: "{name} serves customers in {city}.",
    services: [
      { title: "Our services", body: "What we offer, clearly explained." },
      { title: "Get a quote", body: "Tell us what you need and we'll reply fast." },
      { title: "Visit us", body: "Find us easily with directions and opening times." },
    ],
    highlights: ["Fast replies", "Trusted locally", "Easy to reach"],
  },
};

const fill = (s: string, p: Prospect) => s.replaceAll("{name}", p.name).replaceAll("{city}", p.city || p.country || "your area");

export function defaultMockup(p: Prospect): Mockup {
  const c = COPY[p.industry] ?? COPY.other;
  return {
    headline: fill(c.headline, p),
    tagline: fill(c.tagline, p),
    about: fill(c.about, p),
    services: c.services.map((s) => ({ title: fill(s.title, p), body: fill(s.body, p) })),
    highlights: c.highlights.map((h) => fill(h, p)),
    theme: c.theme,
    cta: p.phone ? "whatsapp" : p.email ? "email" : "call",
    // Their own pictures from their current site, when the audit found some.
    images: { hero: p.audit?.images?.[0], gallery: p.audit?.images?.slice(1, 5) ?? [], logo: p.audit?.logo },
    updated_at: new Date().toISOString(),
  };
}
