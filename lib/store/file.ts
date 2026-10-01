import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Store } from "./index";
import { DEFAULT_SETTINGS, type Activity, type Invoice, type Prospect, type Settings, type Suppressed, type Template } from "@/lib/types";
import { hydrate, matchKeys, uid } from "./shared";
import { scoreProspect } from "@/lib/score";

/**
 * The local store: one JSON file, written atomically (temp file then rename),
 * with every write queued behind the last so two quick clicks can't interleave
 * and lose one of them.
 */

type DB = {
  version: 1;
  prospects: Prospect[];
  activities: Activity[];
  settings: Settings;
  templates: Template[];
  suppressed: Suppressed[];
  invoices: Invoice[];
};

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "leadget.json");

const empty = (): DB => ({ version: 1, prospects: [], activities: [], settings: DEFAULT_SETTINGS, templates: [], suppressed: [], invoices: [] });

async function read(): Promise<DB> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const db = JSON.parse(raw) as DB;
    return {
      ...empty(),
      ...db,
      // Records saved by older versions don't have the newer fields; give them defaults.
      prospects: (db.prospects ?? []).map((p) => ({ ...({ share_id: null, mockup: null, report: null, views: 0, last_viewed_at: null } as Partial<Prospect>), ...p }) as Prospect),
      settings: { ...DEFAULT_SETTINGS, ...db.settings },
    };
  } catch (err: any) {
    if (err?.code === "ENOENT") return empty();
    throw new Error(`Could not read ${FILE}: ${err?.message ?? err}`);
  }
}

let queue: Promise<unknown> = Promise.resolve();

function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const out = await fn(db);
    await fs.mkdir(DIR, { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, FILE);
    return out;
  });
  queue = run.catch(() => {});
  return run;
}

export function fileStore(): Store {
  return {
    kind: "file",
    workspaceId: "personal",

    async countProspects() {
      return (await read()).prospects.length;
    },

    async listProspects() {
      const db = await read();
      return db.prospects.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },

    async getProspect(id) {
      const db = await read();
      return db.prospects.find((p) => p.id === id) ?? null;
    },

    createProspects(rows) {
      return mutate((db) => {
        const seen = new Set(db.prospects.flatMap(matchKeys));
        const created: Prospect[] = [];
        let skipped = 0;
        for (const r of rows) {
          if (!r.name?.trim()) { skipped++; continue; }
          const p = hydrate(r);
          const keys = matchKeys(p);
          if (keys.some((k) => seen.has(k))) { skipped++; continue; }
          keys.forEach((k) => seen.add(k));
          created.push(p);
          db.activities.push({ id: uid(), prospect_id: p.id, type: "created", body: `Added from ${p.source}`, created_at: p.created_at });
        }
        db.prospects.push(...created);
        return { created, skipped };
      });
    },

    updateProspect(id, patch) {
      return mutate((db) => {
        const i = db.prospects.findIndex((p) => p.id === id);
        if (i < 0) return null;
        const next = { ...db.prospects[i], ...patch, id, updated_at: new Date().toISOString() };
        next.score = scoreProspect(next);
        db.prospects[i] = next;
        return next;
      });
    },

    deleteProspects(ids) {
      return mutate((db) => {
        const s = new Set(ids);
        const now = new Date().toISOString();
        for (const p of db.prospects) {
          if (!s.has(p.id)) continue;
          for (const key of matchKeys(p)) db.suppressed.push({ key, name: p.name, prospect_id: p.id, removed_at: now });
        }
        db.prospects = db.prospects.filter((p) => !s.has(p.id));
        db.activities = db.activities.filter((a) => !s.has(a.prospect_id));
      });
    },

    async listSuppressed() {
      return (await read()).suppressed;
    },

    unsuppress(prospectIds) {
      return mutate((db) => {
        db.suppressed = prospectIds ? db.suppressed.filter((x) => !prospectIds.includes(x.prospect_id)) : [];
      });
    },

    async listActivities(prospectId, limit = 200) {
      const db = await read();
      return db.activities
        .filter((a) => !prospectId || a.prospect_id === prospectId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit);
    },

    addActivity(a) {
      return mutate((db) => {
        const row: Activity = { ...a, id: uid(), created_at: new Date().toISOString() };
        db.activities.push(row);
        return row;
      });
    },

    async getSettings() {
      return (await read()).settings;
    },

    saveSettings(s) {
      return mutate((db) => { db.settings = s; });
    },

    async listTemplates() {
      return (await read()).templates.sort((a, b) => a.name.localeCompare(b.name));
    },

    saveTemplate(t) {
      return mutate((db) => {
        if (t.id) {
          const i = db.templates.findIndex((x) => x.id === t.id);
          if (i >= 0) {
            db.templates[i] = { ...db.templates[i], ...t, id: t.id };
            return db.templates[i];
          }
        }
        const row: Template = { ...t, id: uid(), created_at: new Date().toISOString() };
        db.templates.push(row);
        return row;
      });
    },

    deleteTemplate(id) {
      return mutate((db) => { db.templates = db.templates.filter((t) => t.id !== id); });
    },

    async listInvoices(prospectId) {
      return (await read()).invoices
        .filter((i) => !prospectId || i.prospect_id === prospectId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async getInvoice(id) {
      return (await read()).invoices.find((i) => i.id === id) ?? null;
    },

    saveInvoice(inv) {
      return mutate((db) => {
        const row = { ...inv, updated_at: new Date().toISOString() };
        const i = db.invoices.findIndex((x) => x.id === inv.id);
        if (i >= 0) db.invoices[i] = row; else db.invoices.push(row);
        return row;
      });
    },

    deleteInvoice(id) {
      return mutate((db) => { db.invoices = db.invoices.filter((i) => i.id !== id); });
    },
  };
}
