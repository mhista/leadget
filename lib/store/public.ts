import "server-only";
import type { Invoice, Prospect, Settings } from "@/lib/types";
import { SAAS, PERSONAL_WORKSPACE } from "@/lib/mode";
import { storeKind, type Store } from "./index";
import { fileStore } from "./file";
import { supabaseStore } from "./supabase";
import { admin } from "@/lib/saas/supabase";

/**
 * The public side: /r/[id] (audit report) and /m/[id] (mock-up) are opened by
 * prospects, who aren't signed in. The share id is the only key — random,
 * 12 characters, and it reveals nothing but that one business's report.
 */

const SHARE_ID = /^[a-z0-9]{8,24}$/;

async function storeFor(shareId: string): Promise<Store | null> {
  if (!SAAS && storeKind() === "file") return fileStore();
  if (!SAAS) return supabaseStore(PERSONAL_WORKSPACE);
  const { data } = await admin().from("prospects").select("workspace_id").eq("share_id", shareId).maybeSingle();
  return data?.workspace_id ? supabaseStore(data.workspace_id) : null;
}

export async function loadShared(shareId: string): Promise<{ p: Prospect; s: Settings; st: Store } | null> {
  if (!SHARE_ID.test(shareId)) return null;
  const st = await storeFor(shareId);
  if (!st) return null;
  const p = (await st.listProspects()).find((x) => x.share_id === shareId);
  if (!p) return null;
  return { p, s: await st.getSettings(), st };
}

async function storeForInvoice(shareId: string): Promise<Store | null> {
  if (!SAAS && storeKind() === "file") return fileStore();
  if (!SAAS) return supabaseStore(PERSONAL_WORKSPACE);
  const { data } = await admin().from("invoices").select("workspace_id").eq("share_id", shareId).maybeSingle();
  return data?.workspace_id ? supabaseStore(data.workspace_id) : null;
}

/** /i/[id]: the invoice, found by its own share id (separate from the prospect's). */
export async function loadSharedInvoice(shareId: string): Promise<{ inv: Invoice; st: Store } | null> {
  if (!SHARE_ID.test(shareId)) return null;
  const st = await storeForInvoice(shareId);
  if (!st) return null;
  const inv = (await st.listInvoices()).find((x) => x.share_id === shareId);
  return inv ? { inv, st } : null;
}

export async function recordInvoiceView(st: Store, inv: Invoice) {
  const recent = inv.last_viewed_at && Date.now() - new Date(inv.last_viewed_at).getTime() < 3600_000;
  await st.saveInvoice({ ...inv, views: (inv.views ?? 0) + 1, last_viewed_at: new Date().toISOString() });
  if (!recent && inv.prospect_id && (await st.getProspect(inv.prospect_id))) {
    await st.addActivity({ prospect_id: inv.prospect_id, type: "viewed", body: `Opened invoice ${inv.doc.number}` });
  }
}

/** Count an open by the prospect — the best follow-up signal there is. */
export async function recordView(st: Store, p: Prospect, what: "report" | "mockup") {
  const now = new Date().toISOString();
  // One activity per hour per link, so a refresh or two doesn't flood the history.
  const recent = p.last_viewed_at && Date.now() - new Date(p.last_viewed_at).getTime() < 3600_000;
  await st.updateProspect(p.id, { views: (p.views ?? 0) + 1, last_viewed_at: now });
  if (!recent) await st.addActivity({ prospect_id: p.id, type: "viewed", body: what === "report" ? "Opened your website report" : "Opened your mock-up" });
}

export function newShareId() {
  const a = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => a[b % a.length]).join("");
}
