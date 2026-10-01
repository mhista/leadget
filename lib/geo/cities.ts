import "server-only";
import raw from "./cities.json";

/**
 * City search over GeoNames (via all-the-cities, CC-BY 4.0): every place of
 * 1,000+ people, grouped by country and sorted by population. Lives on the
 * server only — it's ~2.8 MB, far too much to ship to the browser — and is
 * searched from /api/geo/cities as you type.
 *
 * Row shape: [name, population, adminCode?, altName?]
 */
type Row = [string, number, string?, string?];
const DATA = raw as unknown as Record<string, Row[]>;

export type City = { name: string; population: number; admin?: string };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const index = new Map<string, { row: Row; key: string; alt: string }[]>();
function rows(cc: string) {
  let r = index.get(cc);
  if (!r) {
    r = (DATA[cc] ?? []).map((row) => ({ row, key: fold(row[0]), alt: fold(row[3] ?? "") }));
    index.set(cc, r);
  }
  return r;
}

export function searchCities(cc: string, q: string, limit = 12): City[] {
  const list = rows(cc.toUpperCase());
  const needle = fold(q.trim());
  const pick = (r: { row: Row }) => ({ name: r.row[0], population: r.row[1], admin: r.row[2] || undefined });
  if (!needle) return list.slice(0, limit).map(pick);
  const starts: typeof list = [], words: typeof list = [], contains: typeof list = [];
  for (const r of list) {
    if (r.key.startsWith(needle) || r.alt.startsWith(needle)) starts.push(r);
    else if (r.key.includes(` ${needle}`) || r.key.includes(`-${needle}`)) words.push(r);
    else if (needle.length >= 3 && (r.key.includes(needle) || r.alt.includes(needle))) contains.push(r);
    if (starts.length >= limit) break;
  }
  return [...starts, ...words, ...contains].slice(0, limit).map(pick);
}

export function hasCities(cc: string) {
  return (DATA[cc.toUpperCase()]?.length ?? 0) > 0;
}
