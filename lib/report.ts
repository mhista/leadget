import type { Audit } from "@/lib/types";

/**
 * Plain-words explanations for the shareable report: why each finding
 * matters and what the fix is. Written for the business owner, not a developer.
 */
export const FIX: Record<string, { why: string; fix: string }> = {
  down: { why: "Anyone who finds you on Google or a card gets an error instead of your business.", fix: "Get the site back online, then move it to reliable hosting with monitoring so you know the moment it goes down." },
  status: { why: "Visitors see an error page instead of your business.", fix: "Find and fix the error, and set up monitoring so it doesn't happen silently again." },
  "bad-url": { why: "The address listed for you doesn't lead to a website.", fix: "Point your domain at a working site and update your Google listing." },
  parked: { why: "People who look you up see a placeholder, which makes the business look closed.", fix: "Replace the placeholder with a real homepage — even a single good page is a big step up." },
  https: { why: "Browsers label the site “Not secure”, which puts people off contacting you or paying.", fix: "Install a free SSL certificate and redirect every page to https." },
  mobile: { why: "Most visitors are on phones; they see a shrunken desktop page and leave.", fix: "Rebuild the layout to be mobile-first, so text, buttons and forms fit any screen." },
  slow: { why: "Every extra second of loading loses visitors — especially on mobile data.", fix: "Compress images, remove heavy scripts and use faster hosting with caching." },
  "ps-perf": { why: "Google uses speed when deciding who ranks higher, and slow sites lose visitors.", fix: "Optimise images and code, and lazy-load what isn't needed straight away." },
  "ps-lcp": { why: "Visitors wait staring at a blank or half-loaded page.", fix: "Serve a lighter hero image and load the main content first." },
  "ps-seo": { why: "Missing basics make it harder for Google to understand and rank the site.", fix: "Add proper titles, descriptions, headings and image labels to each page." },
  stale: { why: "An old year in the footer makes the business look inactive.", fix: "Update the content and set the year to update itself." },
  title: { why: "Google shows a weak listing, so fewer people click through.", fix: "Write a clear page title with your business name, service and city." },
  meta: { why: "Google picks random text to show under your name in results.", fix: "Write a short description that says what you do and why people should choose you." },
  capture: { why: "Interested visitors have no quick way to reach you, so many don't.", fix: "Add a short enquiry form, a WhatsApp button and a clear call to action on every page." },
  analytics: { why: "There's no way to know how many people visit or where they come from.", fix: "Install privacy-friendly analytics so you can see what's working." },
  platform: { why: "Website builders limit speed, search ranking and what you can add later.", fix: "Move to a fast, custom-built site you fully own." },
  social: { why: "Customers often check social profiles before they get in touch.", fix: "Link your active social profiles from the header or footer." },
  heavy: { why: "A heavy page is slow and expensive to load on mobile data.", fix: "Trim unused code and compress assets." },
};

/** 0–100 health score for the report headline: the opposite of the opportunity. */
export function health(a: Audit) {
  if (!a.reachable) return 5;
  const base = 100 - a.opportunity;
  const ps = a.pagespeed?.performance;
  return Math.max(5, Math.round(ps != null ? base * 0.6 + ps * 0.4 : base));
}

export function grade(score: number) {
  if (score >= 85) return { letter: "A", label: "In good shape", color: "#16804E" };
  if (score >= 70) return { letter: "B", label: "A few things to fix", color: "#5E8C1F" };
  if (score >= 50) return { letter: "C", label: "Losing customers", color: "#C47A0C" };
  if (score >= 30) return { letter: "D", label: "Needs work", color: "#D2632A" };
  return { letter: "F", label: "Urgent", color: "#C8372D" };
}
