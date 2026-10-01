import "server-only";
import { playbook } from "@/lib/industries";

/**
 * Finding businesses.
 *
 * Two sources, same output shape:
 *
 * - Google Places (New) Text Search, when GOOGLE_PLACES_API_KEY is set. The
 *   best data there is — website, phone, rating and review count for most
 *   businesses, anywhere in the world. Up to 60 results per search. Google
 *   gives a monthly free credit that covers thousands of searches.
 *
 * - OpenStreetMap via Nominatim, always available, no key. Patchier (many
 *   businesses have no website or phone tagged), but free and good enough to
 *   start. Nominatim asks for at most one request a second and an honest
 *   User-Agent; we make two requests per search at most.
 */

export type Found = {
  source: "google" | "osm";
  source_ref: string;
  name: string;
  address: string;
  city: string;
  country: string;
  website: string;
  phone: string;
  email: string;
  rating: number | null;
  reviews: number | null;
  category: string;
  closed?: boolean;
};

export type SearchResult = { ok: true; results: Found[]; source: "google" | "osm"; query: string } | { ok: false; error: string };

export function googleConfigured() {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

/** OpenStreetMap's public Nominatim is fine for one person; a product needs its own instance. */
const NOMINATIM = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
export function osmAllowed() {
  return process.env.APP_MODE !== "saas" || !!process.env.NOMINATIM_URL;
}

export async function discover({
  industry, keyword, cities, country, source,
}: { industry: string; keyword?: string; cities: string[]; country: string; source?: "google" | "osm" }): Promise<SearchResult> {
  const pb = playbook(industry);
  const wantGoogle = (source ?? (googleConfigured() ? "google" : "osm")) === "google";
  const useGoogle = wantGoogle && googleConfigured();
  if (!useGoogle && !osmAllowed()) {
    return { ok: false, error: "Business search isn't configured on this server yet." };
  }
  const what = (keyword?.trim() || (useGoogle ? pb.google : pb.osm) || pb.label).trim();
  const places = cities.map((c) => c.trim()).filter(Boolean);
  if (!places.length && !country.trim()) return { ok: false, error: "Pick a country, or a city, to search in." };
  const targets = places.length ? places : [""];
  const query = `${what} in ${places.length ? places.join(", ") : country}${places.length && country ? `, ${country}` : ""}`;

  try {
    const seen = new Set<string>();
    const results: Found[] = [];
    for (const [i, city] of targets.entries()) {
      const q = `${what} in ${[city, country].filter(Boolean).join(", ")}`;
      const batch = useGoogle ? await google(q, city, country) : await osm(q, city, country);
      for (const r of batch) if (!seen.has(r.source_ref)) { seen.add(r.source_ref); results.push(r); }
      if (!useGoogle && i < targets.length - 1) await new Promise((r) => setTimeout(r, 1100));
    }
    return { ok: true, results, source: useGoogle ? "google" : "osm", query };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Search failed." };
  }
}

/* ── Google Places (New) ─────────────────────────────────────────────── */

const FIELDS = [
  "places.id", "places.displayName", "places.formattedAddress", "places.websiteUri",
  "places.internationalPhoneNumber", "places.nationalPhoneNumber", "places.rating",
  "places.userRatingCount", "places.businessStatus", "places.primaryTypeDisplayName", "nextPageToken",
].join(",");

async function google(query: string, city: string, country: string): Promise<Found[]> {
  const out: Found[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 3; page++) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify({ textQuery: query, pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 403) throw new Error("Google refused the key. Check that “Places API (New)” is enabled for it and billing is set up.");
      if (res.status === 429) throw new Error("Google's rate limit was hit. Wait a minute and search again.");
      throw new Error(`Google Places returned ${res.status}. ${body.slice(0, 160)}`);
    }
    const data = await res.json();
    for (const p of data.places ?? []) {
      out.push({
        source: "google",
        source_ref: `google:${p.id}`,
        name: p.displayName?.text ?? "Unnamed",
        address: p.formattedAddress ?? "",
        city, country,
        website: p.websiteUri ?? "",
        phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? "",
        email: "",
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? null,
        category: p.primaryTypeDisplayName?.text ?? "",
        closed: p.businessStatus && p.businessStatus !== "OPERATIONAL",
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // Google needs a moment before a next-page token becomes valid.
    await new Promise((r) => setTimeout(r, 1200));
  }
  return out;
}

/* ── OpenStreetMap / Nominatim ───────────────────────────────────────── */

async function osm(query: string, city: string, country: string): Promise<Found[]> {
  const out: Found[] = [];
  const exclude: string[] = [];
  for (let page = 0; page < 2; page++) {
    const u = new URL(`${NOMINATIM}/search`);
    u.searchParams.set("q", query);
    u.searchParams.set("format", "jsonv2");
    u.searchParams.set("addressdetails", "1");
    u.searchParams.set("extratags", "1");
    u.searchParams.set("limit", "40");
    if (exclude.length) u.searchParams.set("exclude_place_ids", exclude.join(","));
    const res = await fetch(u, {
      headers: { "User-Agent": "Leadget/0.1 (self-hosted lead research tool)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 429) throw new Error("OpenStreetMap is rate-limiting. Wait a minute and try again.");
    if (!res.ok) throw new Error(`OpenStreetMap returned ${res.status}.`);
    const rows: any[] = await res.json();
    for (const r of rows) {
      exclude.push(String(r.place_id));
      const t = r.extratags ?? {};
      const a = r.address ?? {};
      const name = r.name || t.brand || "";
      if (!name) continue;
      out.push({
        source: "osm",
        source_ref: `osm:${r.osm_type}/${r.osm_id}`,
        name,
        address: [a.house_number, a.road, a.suburb].filter(Boolean).join(" ") || r.display_name?.split(",").slice(1, 3).join(",").trim() || "",
        city: a.city || a.town || a.village || a.county || a.state || city,
        country: a.country || country,
        website: t.website || t["contact:website"] || t.url || "",
        phone: t.phone || t["contact:phone"] || t["contact:mobile"] || "",
        email: t.email || t["contact:email"] || "",
        rating: null,
        reviews: null,
        category: String(r.type ?? "").replace(/_/g, " "),
      });
    }
    if (rows.length < 40) break;
    await new Promise((r) => setTimeout(r, 1100)); // Nominatim: max 1 req/s
  }
  return out;
}
