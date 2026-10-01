import { NextResponse } from "next/server";
import { searchCities } from "@/lib/geo/cities";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const cc = (u.searchParams.get("cc") ?? "").slice(0, 2);
  const q = (u.searchParams.get("q") ?? "").slice(0, 60);
  if (!/^[A-Za-z]{2}$/.test(cc)) return NextResponse.json({ cities: [] });
  return NextResponse.json(
    { cities: searchCities(cc, q, 14) },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
  );
}
