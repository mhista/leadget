import "server-only";
import type { Activity, Invoice, Prospect, ProspectInput, Settings, Suppressed, Template } from "@/lib/types";
import { SAAS, PERSONAL_WORKSPACE } from "@/lib/mode";
import { fileStore } from "./file";
import { supabaseStore } from "./supabase";

/**
 * One interface, two backends, and — in SaaS mode — one workspace at a time.
 *
 * Personal mode: .data/leadget.json on this computer, or your own Supabase
 * when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (everything under
 * workspace "personal").
 *
 * SaaS mode: always Supabase, scoped to the signed-in person's workspace.
 * The workspace comes from the verified session on the server, never from
 * anything the browser sends.
 */
export interface Store {
  kind: "file" | "supabase";
  workspaceId: string;
  listProspects(): Promise<Prospect[]>;
  countProspects(): Promise<number>;
  getProspect(id: string): Promise<Prospect | null>;
  createProspects(rows: ProspectInput[]): Promise<{ created: Prospect[]; skipped: number }>;
  updateProspect(id: string, patch: Partial<Prospect>): Promise<Prospect | null>;
  /** Deletes, and remembers them (by match keys) so searches don't bring them back. */
  deleteProspects(ids: string[]): Promise<void>;
  listSuppressed(): Promise<Suppressed[]>;
  /** Let removed businesses show up again (all of them when no ids are given). */
  unsuppress(prospectIds?: string[]): Promise<void>;
  listActivities(prospectId?: string, limit?: number): Promise<Activity[]>;
  addActivity(a: Omit<Activity, "id" | "created_at">): Promise<Activity>;
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  listTemplates(): Promise<Template[]>;
  saveTemplate(t: Omit<Template, "id" | "created_at"> & { id?: string }): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  listInvoices(prospectId?: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | null>;
  /** Insert or replace by id. */
  saveInvoice(inv: Invoice): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
}

export function storeKind(): Store["kind"] {
  return SAAS || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ? "supabase" : "file";
}

export async function store(): Promise<Store> {
  if (SAAS) {
    const { requireSession } = await import("@/lib/saas/workspace");
    const s = await requireSession();
    return supabaseStore(s.workspace.id);
  }
  return storeKind() === "supabase" ? supabaseStore(PERSONAL_WORKSPACE) : fileStore();
}
