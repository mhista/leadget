/**
 * Copy everything from .data/leadget.json (your local Leadget) into Supabase.
 *
 *   1. Put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   2. node scripts/migrate-to-supabase.mjs
 *
 * Safe to run more than once: rows are upserted by id, nothing is deleted,
 * and your local file is left exactly as it is.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Minimal .env.local reader, so there's nothing extra to install.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
if (!existsSync(".data/leadget.json")) {
  console.error("✗ No .data/leadget.json here — run this from the leadget folder.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const data = JSON.parse(readFileSync(".data/leadget.json", "utf8"));
const WS = "personal";

async function upsert(table, rows, conflict = "id") {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + 200), { onConflict: conflict });
    if (error) { console.error(`✗ ${table}: ${error.message}`); process.exit(1); }
  }
  console.log(`✓ ${table}: ${rows.length}`);
}

const prospects = (data.prospects ?? []).map((p) => ({
  share_id: null, mockup: null, report: null, views: 0, last_viewed_at: null, ...p, workspace_id: WS,
}));
const ids = new Set(prospects.map((p) => p.id));

await upsert("prospects", prospects);
await upsert("activities", (data.activities ?? []).filter((a) => ids.has(a.prospect_id)).map((a) => ({ ...a, workspace_id: WS })));
await upsert("templates", (data.templates ?? []).map((t) => ({ category: "", ...t, workspace_id: WS })));
await upsert("settings", [{ workspace_id: WS, data: data.settings ?? {} }], "workspace_id");
await upsert("suppressed", (data.suppressed ?? []).map((x) => ({ ...x, workspace_id: WS })), "workspace_id,key");
await upsert("invoices", (data.invoices ?? []).map((i) => ({ ...i, number: i.doc?.number ?? "", workspace_id: WS })));
console.log("\nDone. Leadget will use Supabase as soon as it restarts with these keys set.");
