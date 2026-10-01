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

export type Theme = {
  id: string;
  name: string;
  bg: string; surface: string; ink: string; muted: string; line: string;
  accent: string; accentInk: string;
  hero: string; heroInk: string; heroMuted: string;
  display: string; // font family for headings
};

export const THEMES: Theme[] = [
  { id: "forest", name: "Forest", bg: "#F6F4EE", surface: "#FFFFFF", ink: "#14201A", muted: "#5B665F", line: "#E3E0D6",
    accent: "#1F6B4A", accentInk: "#FFFFFF", hero: "#10231A", heroInk: "#F3F1E9", heroMuted: "#A8B7AE", display: "Fraunces, Georgia, serif" },
  { id: "noir", name: "Noir & gold", bg: "#F7F5F0", surface: "#FFFFFF", ink: "#161412", muted: "#6A645C", line: "#E6E1D8",
    accent: "#B08A3E", accentInk: "#161412", hero: "#141210", heroInk: "#F5EFE3", heroMuted: "#B3A993", display: "Fraunces, Georgia, serif" },
  { id: "ocean", name: "Ocean", bg: "#F3F7FA", surface: "#FFFFFF", ink: "#0E1B2B", muted: "#566476", line: "#DDE6EE",
    accent: "#1C64D1", accentInk: "#FFFFFF", hero: "#0B2242", heroInk: "#EEF4FC", heroMuted: "#9FB3CF", display: "'Instrument Sans', Inter, system-ui, sans-serif" },
  { id: "mint", name: "Mint", bg: "#F2F8F6", surface: "#FFFFFF", ink: "#0F2320", muted: "#55706A", line: "#D9E9E4",
    accent: "#0E9F7E", accentInk: "#FFFFFF", hero: "#0B3A33", heroInk: "#ECFAF6", heroMuted: "#9CC7BD", display: "'Instrument Sans', Inter, system-ui, sans-serif" },
  { id: "ember", name: "Ember", bg: "#FBF5F0", surface: "#FFFFFF", ink: "#2A1610", muted: "#7A5E54", line: "#EFE1D8",
    accent: "#D2542C", accentInk: "#FFFFFF", hero: "#2B130C", heroInk: "#FCEFE7", heroMuted: "#D4AE9E", display: "Fraunces, Georgia, serif" },
  { id: "plum", name: "Plum", bg: "#F7F4FB", surface: "#FFFFFF", ink: "#1D1330", muted: "#665C78", line: "#E6DFF0",
    accent: "#6D3FD6", accentInk: "#FFFFFF", hero: "#1B0F36", heroInk: "#F3EEFE", heroMuted: "#B2A4D2", display: "Fraunces, Georgia, serif" },
];

export const THEME = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<string, Theme>;

type Copy = { headline: string; tagline: string; about: string; services: MockupService[]; highlights: string[]; theme: string };

const COPY: Record<string, Copy> = {
  "real-estate": {
    theme: "forest",
    headline: "Find your next home in {city}",
    tagline: "Browse available properties, book a viewing, and talk to our team on WhatsApp — all in one place.",
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
    theme: "mint",
    headline: "Your neighbourhood pharmacy in {city}",
    tagline: "Order your medicines online, check what's in stock, and get refill reminders — without the phone calls.",
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
    theme: "noir",
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
    theme: "ocean",
    headline: "Care you can book in minutes",
    tagline: "See a doctor at {name} — book online, get reminders, and skip the phone queue.",
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
    theme: "ocean",
    headline: "A healthier smile, booked in a minute",
    tagline: "Check-ups, cleaning and cosmetic treatments at {name} — book online.",
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
    theme: "ember",
    headline: "Order from {name} — direct",
    tagline: "See the full menu, order for pickup or delivery, and book a table, straight from us.",
    about: "{name} serves {city} with food made the way it should be.",
    services: [
      { title: "Full menu", body: "Every dish with photos and prices, always up to date." },
      { title: "Order online", body: "Pickup or delivery, ordered directly — no app in the middle." },
      { title: "Book a table", body: "Reserve for dinner, birthdays and groups." },
      { title: "Events & catering", body: "Let us feed your office, party or celebration." },
    ],
    highlights: ["Order direct", "Fresh every day", "Table bookings online"],
  },
  hotel: {
    theme: "noir",
    headline: "Stay at {name}",
    tagline: "Book directly for the best rate — see the rooms, check availability and confirm in minutes.",
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
    theme: "plum",
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
    theme: "ocean",
    headline: "Deliveries you can track",
    tagline: "Get an instant quote, book a pickup, and follow your package every step of the way.",
    about: "{name} moves packages and freight across {city} and beyond — on time.",
    services: [
      { title: "Same-day delivery", body: "Fast deliveries across the city." },
      { title: "Track a shipment", body: "Live status, without calling anyone." },
      { title: "Instant quote", body: "Know the price before you book." },
      { title: "Business accounts", body: "Regular shipments with monthly billing." },
    ],
    highlights: ["Live tracking", "Instant quotes", "Reliable riders"],
  },
  salon: {
    theme: "ember",
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
    theme: "mint",
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
    theme: "ember",
    headline: "Shop {name} online",
    tagline: "Browse what's in store, order for delivery, and get updates on new arrivals.",
    about: "{name} brings great products to customers in {city} — now online too.",
    services: [
      { title: "Shop the range", body: "Everything in store, with prices and photos." },
      { title: "Delivery & pickup", body: "Order online, collect or have it delivered." },
      { title: "New arrivals", body: "Be first to know what's just landed." },
      { title: "Order on WhatsApp", body: "Prefer to chat? Order in a message." },
    ],
    highlights: ["Secure payments", "Fast delivery", "Real customer service"],
  },
  finance: {
    theme: "ocean",
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
    theme: "forest",
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
    theme: "plum",
    headline: "Welcome home",
    tagline: "Service times, sermons and events at {name} — and give online.",
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
    theme: "plum",
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
    theme: "forest",
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
    updated_at: new Date().toISOString(),
  };
}
