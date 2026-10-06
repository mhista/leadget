import "server-only";
import { T } from "./tables";
import { KYMAA } from "@/lib/mode";
import { kymaaUserId } from "@/lib/kymaa-auth";
import type { Store } from "./index";
import { DEFAULT_SETTINGS, type Activity, type Invoice, type Prospect, type Settings, type Suppressed, type Template } from "@/lib/types";
import { hydrate, matchKeys, uid } from "./shared";
import { scoreProspect } from "@/lib/score";
import { admin } from "@/lib/saas/supabase";

/**
 * The Supabase store. Every query is pinned to one workspace_id here and
 * nowhere else — that is the tenancy boundary for the service-role client.
 * (RLS policies in supabase/schema.sql cover anything using the anon key.)
 *
 * Tables are created by supabase/schema.sql.
 */

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data as T;
}

const strip = <T extends Record<string, unknown>>(row: T) => {
  const { workspace_id: _w, ...rest } = row as T & { workspace_id?: string };
  return rest as unknown as T;
};

export function supabaseStore(ws: string): Store {
  const db = () => admin();
  return {
    kind: "supabase",
    workspaceId: ws,

    async listProspects() {
      const rows = must(await db().from(T("prospects")).select("*").eq("workspace_id", ws).order("updated_at", { ascending: false }).limit(10000));
      return (rows as Prospect[]).map(strip);
    },

    async countProspects() {
      const { count, error } = await db().from(T("prospects")).select("id", { count: "exact", head: true }).eq("workspace_id", ws);
      if (error) throw new Error(`Supabase: ${error.message}`);
      return count ?? 0;
    },

    async getProspect(id) {
      const row = must(await db().from(T("prospects")).select("*").eq("workspace_id", ws).eq("id", id).maybeSingle());
      return row ? strip(row as Prospect) : null;
    },

    async createProspects(rows) {
      const existing = must(await db().from(T("prospects")).select("name,city,website,phone,source_ref").eq("workspace_id", ws).limit(20000)) as Prospect[];
      const seen = new Set(existing.flatMap(matchKeys));
      const created: Prospect[] = [];
      let skipped = 0;
      for (const r of rows) {
        if (!r.name?.trim()) { skipped++; continue; }
        const p = hydrate(r);
        const keys = matchKeys(p);
        if (keys.some((k) => seen.has(k))) { skipped++; continue; }
        keys.forEach((k) => seen.add(k));
        created.push(p);
      }
      if (created.length) {
        must(await db().from(T("prospects")).insert(created.map((p) => ({ ...p, workspace_id: ws }))));
        must(await db().from(T("activities")).insert(created.map((p) => ({
          id: uid(), workspace_id: ws, prospect_id: p.id, type: "created", body: `Added from ${p.source}`, created_at: p.created_at,
        }))));
      }
      return { created, skipped };
    },

    async updateProspect(id, patch) {
      const current = await this.getProspect(id);
      if (!current) return null;
      const next = { ...current, ...patch, id, updated_at: new Date().toISOString() };
      next.score = scoreProspect(next);
      must(await db().from(T("prospects")).update(next).eq("workspace_id", ws).eq("id", id));
      return next;
    },

    async deleteProspects(ids) {
      if (!ids.length) return;
      const gone = must(await db().from(T("prospects")).select("id,name,city,website,phone,source_ref").eq("workspace_id", ws).in("id", ids)) as Prospect[];
      const now = new Date().toISOString();
      const rows = gone.flatMap((p) => matchKeys(p).map((key) => ({ workspace_id: ws, key, name: p.name, prospect_id: p.id, removed_at: now })));
      if (rows.length) must(await db().from(T("suppressed")).upsert(rows, { onConflict: "workspace_id,key" }));
      must(await db().from(T("prospects")).delete().eq("workspace_id", ws).in("id", ids));
    },

    async listSuppressed() {
      return (must(await db().from(T("suppressed")).select("key,name,prospect_id,removed_at").eq("workspace_id", ws).limit(50000)) as Suppressed[]);
    },

    async unsuppress(prospectIds) {
      let q = db().from(T("suppressed")).delete().eq("workspace_id", ws);
      if (prospectIds) q = q.in("prospect_id", prospectIds);
      must(await q);
    },

    async listActivities(prospectId, limit = 200) {
      let q = db().from(T("activities")).select("*").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(limit);
      if (prospectId) q = q.eq("prospect_id", prospectId);
      return (must(await q) as Activity[]).map(strip);
    },

    async addActivity(a) {
      const row: Activity = { ...a, id: uid(), created_at: new Date().toISOString() };
      // Kymaa mode: remember who did it, so the dashboard can show it.
      const extra = KYMAA ? { author: await kymaaUserId() } : {};
      must(await db().from(T("activities")).insert({ ...row, ...extra, workspace_id: ws }));
      return row;
    },

    async getSettings() {
      const data = must(await db().from(T("settings")).select("data").eq("workspace_id", ws).maybeSingle()) as { data: Settings } | null;
      return { ...DEFAULT_SETTINGS, ...(data?.data ?? {}) };
    },

    async saveSettings(s) {
      must(await db().from(T("settings")).upsert({ workspace_id: ws, data: s }));
    },

    async listTemplates() {
      return (must(await db().from(T("templates")).select("*").eq("workspace_id", ws).order("name")) as Template[]).map(strip);
    },

    async saveTemplate(t) {
      const row: Template = {
        id: t.id ?? uid(), created_at: new Date().toISOString(),
        name: t.name, industry: t.industry, channel: t.channel, subject: t.subject, body: t.body, category: t.category ?? "",
      };
      if (t.id) {
        const owned = must(await db().from(T("templates")).select("id").eq("workspace_id", ws).eq("id", t.id).maybeSingle());
        if (!owned) throw new Error("That template doesn't exist.");
      }
      must(await db().from(T("templates")).upsert({ ...row, workspace_id: ws }));
      return row;
    },

    async deleteTemplate(id) {
      must(await db().from(T("templates")).delete().eq("workspace_id", ws).eq("id", id));
    },

    async listInvoices(prospectId) {
      let q = db().from(T("invoices")).select("*").eq("workspace_id", ws).order("created_at", { ascending: false }).limit(5000);
      if (prospectId) q = q.eq("prospect_id", prospectId);
      return (must(await q) as (Invoice & { number?: string })[]).map((r) => { const { number: _n, ...x } = strip(r); return x as Invoice; });
    },

    async getInvoice(id) {
      const row = must(await db().from(T("invoices")).select("*").eq("workspace_id", ws).eq("id", id).maybeSingle()) as (Invoice & { number?: string }) | null;
      if (!row) return null;
      const { number: _n, ...x } = strip(row);
      return x as Invoice;
    },

    async saveInvoice(inv) {
      const existing = must(await db().from(T("invoices")).select("workspace_id").eq("id", inv.id).maybeSingle()) as { workspace_id: string } | null;
      if (existing && existing.workspace_id !== ws) throw new Error("That invoice doesn't exist.");
      const row = { ...inv, updated_at: new Date().toISOString() };
      must(await db().from(T("invoices")).upsert({ ...row, number: inv.doc.number, workspace_id: ws }));
      return row;
    },

    async deleteInvoice(id) {
      must(await db().from(T("invoices")).delete().eq("workspace_id", ws).eq("id", id));
    },
  };
}
