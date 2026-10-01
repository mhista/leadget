"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { store } from "@/lib/store";
import { auditWebsite } from "@/lib/audit";
import { discover, type Found } from "@/lib/discover";
import { writePitch } from "@/lib/pitch";
import { renderTemplate } from "@/lib/render";
import { playbook } from "@/lib/industries";
import { SWIPE } from "@/lib/swipe";
import { matchKeys, uid } from "@/lib/store/shared";
import { SAAS } from "@/lib/mode";
import { groqConfigured } from "@/lib/ai/groq";
import type { ProspectFilters } from "@/lib/filters";
import { STAGE_META, type ActivityType, type Invoice, type InvoiceDoc, type Mockup, type ReportDoc, type Prospect, type ProspectInput, type Settings, type Stage, type Template } from "@/lib/types";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";
import type { Meter } from "@/lib/saas/plans";

/**
 * Every write the app makes goes through here. Server actions, so keys
 * (Supabase service role, Groq, Google, Paystack) stay on the server.
 * In SaaS mode the metered ones spend credits first.
 */

const refresh = () => revalidatePath("/", "layout");
type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
const fail = (err: unknown): { ok: false; error: string } => ({ ok: false, error: err instanceof Error ? err.message : String(err) });

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Spend credits (SaaS only). Throws a readable error when they've run out. */
async function meter(m: Meter, n = 1) {
  if (!SAAS || n <= 0) return;
  const { requireSession, spend } = await import("@/lib/saas/workspace");
  await spend(await requireSession(), m, n);
}

/** Refuse to grow past the plan's prospect cap (SaaS only). */
async function roomFor(n: number) {
  if (!SAAS) return;
  const { requireSession } = await import("@/lib/saas/workspace");
  const { PLAN } = await import("@/lib/saas/plans");
  const s = await requireSession();
  const cap = PLAN[s.plan].limits.prospects;
  const have = await (await store()).countProspects();
  if (have + n > cap) throw new Error(`Your plan holds ${cap.toLocaleString()} prospects and you have ${have.toLocaleString()}. Delete some, or upgrade on the Billing page.`);
}

/**
 * What's off-limits for new searches: everything already in the list, plus
 * businesses removed within the last N days (Settings → forget_removed_days).
 */
async function blocklist() {
  const st = await store();
  const [existing, suppressed, settings] = await Promise.all([st.listProspects(), st.listSuppressed(), st.getSettings()]);
  const added = new Set(existing.flatMap(matchKeys));
  const cutoff = Date.now() - (settings.forget_removed_days ?? 90) * 86400000;
  const removed = new Set(suppressed.filter((x) => new Date(x.removed_at).getTime() > cutoff).map((x) => x.key));
  const status = (r: { name: string; city?: string; website?: string; phone?: string; source_ref?: string }): "added" | "removed" | null => {
    const keys = matchKeys(r);
    if (keys.some((k) => added.has(k))) return "added";
    if (keys.some((k) => removed.has(k))) return "removed";
    return null;
  };
  return { st, status, suppressed };
}

/* ── Prospects ───────────────────────────────────────────────────────── */

export async function createProspect(input: ProspectInput): Promise<Result<{ id: string }>> {
  try {
    if (!input.name?.trim()) return { ok: false, error: "Give the business a name." };
    await roomFor(1);
    const pb = playbook(input.industry);
    // Adding it by hand is a decision: lift any "removed" hold on this business.
    const { st, suppressed } = await blocklist();
    const keys = new Set(matchKeys({ ...input, website: input.website ?? "", phone: input.phone ?? "" }));
    const held = [...new Set(suppressed.filter((x) => keys.has(x.key)).map((x) => x.prospect_id))];
    if (held.length) await st.unsuppress(held);
    const { created, skipped } = await st.createProspects([
      { deal_value: pb.typical_deal, ...input, source: input.source ?? "manual" },
    ]);
    if (!created.length) return { ok: false, error: skipped ? "That business is already in your list." : "Couldn't add it." };
    refresh();
    return { ok: true, data: { id: created[0].id } };
  } catch (e) { return fail(e); }
}

export async function importFound(found: Found[], industry: string, auto_audit = false): Promise<Result<{ created: number; skipped: number; ids: string[] }>> {
  try {
    const { st, status } = await blocklist();
    const fresh = found.filter((f) => status(f) === null);
    const held = found.length - fresh.length;
    await roomFor(fresh.length);
    const pb = playbook(industry);
    const { created, skipped: dupes } = await st.createProspects(
      fresh.map((f) => ({
        name: f.name, industry, city: f.city, country: f.country, address: f.address,
        website: f.website, phone: f.phone, email: f.email, rating: f.rating, reviews: f.reviews,
        source: f.source, source_ref: f.source_ref, deal_value: pb.typical_deal,
        tags: f.category ? [f.category] : [],
      })),
    );
    const skipped = dupes + held;
    let audited = 0;
    if (auto_audit) {
      const withSite = created.filter((p) => p.website);
      try { await meter("audits", withSite.length); } catch { /* out of audit credits: still add them, just don't audit */ return done(); }
      // A handful in parallel — quick, without hammering anyone.
      for (let i = 0; i < withSite.length; i += 5) {
        await Promise.all(withSite.slice(i, i + 5).map((p) => auditOne(p).catch(() => null)));
      }
      audited = withSite.length;
    }
    return done();
    function done() {
      refresh();
      return { ok: true as const, data: { created: created.length, skipped, ids: created.map((c) => c.id), audited } };
    }
  } catch (e) { return fail(e); }
}

export async function importRows(rows: ProspectInput[]): Promise<Result<{ created: number; skipped: number }>> {
  try {
    const { st, status } = await blocklist();
    const fresh = rows.filter((r) => status({ ...r, website: r.website ?? "", phone: r.phone ?? "" }) === null);
    await roomFor(fresh.length);
    const { created, skipped } = await st.createProspects(
      fresh.map((r) => ({ ...r, source: "csv", deal_value: r.deal_value ?? playbook(r.industry).typical_deal })),
    );
    refresh();
    return { ok: true, data: { created: created.length, skipped: skipped + rows.length - fresh.length } };
  } catch (e) { return fail(e); }
}

export async function updateProspect(id: string, patch: Partial<Prospect>): Promise<Result<Prospect>> {
  try {
    const st = await store();
    const before = await st.getProspect(id);
    if (!before) return { ok: false, error: "That prospect no longer exists." };
    const { id: _i, created_at: _c, ...safe } = patch;
    const next = await st.updateProspect(id, safe);
    if (patch.stage && patch.stage !== before.stage) {
      await st.addActivity({ prospect_id: id, type: "stage", body: `${STAGE_META[before.stage].label} → ${STAGE_META[patch.stage].label}` });
    }
    refresh();
    return { ok: true, data: next! };
  } catch (e) { return fail(e); }
}

export async function setStage(id: string, stage: Stage) {
  return updateProspect(id, { stage });
}

export async function setStageMany(ids: string[], stage: Stage): Promise<Result> {
  try {
    for (const id of ids) await updateProspect(id, { stage });
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

export async function tagMany(ids: string[], tag: string): Promise<Result> {
  try {
    const t = tag.trim();
    if (!t) return { ok: false, error: "Type a tag." };
    const st = await store();
    for (const id of ids) {
      const p = await st.getProspect(id);
      if (p && !p.tags.includes(t)) await st.updateProspect(id, { tags: [...p.tags, t] });
    }
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

export async function deleteProspects(ids: string[]): Promise<Result> {
  try {
    await (await store()).deleteProspects(ids);
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

export async function deleteAndGoBack(id: string) {
  await (await store()).deleteProspects([id]);
  refresh();
  redirect("/prospects");
}

/* ── Audit ───────────────────────────────────────────────────────────── */

async function auditOne(p: Prospect) {
  if (!p.website) return null;
  const st = await store();
  const audit = await auditWebsite(p.website);
  const patch: Partial<Prospect> = { audit };
  // Found an email or phone on their site and we had none? Keep it.
  if (!p.email && audit.emails[0]) patch.email = audit.emails[0];
  if (!p.phone && audit.phones[0]) patch.phone = audit.phones[0];
  const li = audit.socials.find((s) => s.network === "LinkedIn");
  if (!p.linkedin && li) patch.linkedin = li.url;
  if (p.stage === "new") patch.stage = "researching";
  const next = await st.updateProspect(p.id, patch);
  await st.addActivity({
    prospect_id: p.id, type: "audit",
    body: audit.reachable ? `Website audited — ${audit.issues.length} issue${audit.issues.length === 1 ? "" : "s"} found` : "Website audit — site didn't load",
  });
  return next;
}

export async function runAudit(id: string): Promise<Result<Prospect>> {
  try {
    const p = await (await store()).getProspect(id);
    if (!p) return { ok: false, error: "Prospect not found." };
    if (!p.website) return { ok: false, error: "Add a website first — or pitch them one, since they don't have it." };
    await meter("audits");
    const next = await auditOne(p);
    refresh();
    return { ok: true, data: next! };
  } catch (e) { return fail(e); }
}

export async function runAuditMany(ids: string[]): Promise<Result<{ audited: number }>> {
  try {
    const all = await (await store()).listProspects();
    const targets = all.filter((p) => ids.includes(p.id) && p.website);
    await meter("audits", targets.length);
    for (let i = 0; i < targets.length; i += 5) {
      await Promise.all(targets.slice(i, i + 5).map((p) => auditOne(p).catch(() => null)));
    }
    refresh();
    return { ok: true, data: { audited: targets.length } };
  } catch (e) { return fail(e); }
}

/* ── Finding businesses ──────────────────────────────────────────────── */

export async function searchBusinesses(params: { industry: string; keyword?: string; cities: string[]; country: string; source?: "google" | "osm" }) {
  try {
    await meter("searches", Math.max(1, params.cities.filter(Boolean).length));
  } catch (e) { return fail(e); }
  const res = await discover(params);
  if (!res.ok) return res;
  // Tag what you already have (or removed recently) so the results can hide it.
  const { status } = await blocklist();
  return {
    ...res,
    results: res.results.map((r) => {
      const st = status(r);
      return { ...r, status: st, already: st !== null };
    }),
  };
}

/** Businesses you've removed that are still being kept out of searches. */
export async function listRemoved(): Promise<Result<{ prospect_id: string; name: string; removed_at: string; returns_at: string }[]>> {
  try {
    const st = await store();
    const [sup, s] = await Promise.all([st.listSuppressed(), st.getSettings()]);
    const days = s.forget_removed_days ?? 90;
    const byId = new Map<string, { prospect_id: string; name: string; removed_at: string; returns_at: string }>();
    for (const x of sup) {
      const back = new Date(new Date(x.removed_at).getTime() + days * 86400000);
      if (back.getTime() < Date.now() || byId.has(x.prospect_id)) continue;
      byId.set(x.prospect_id, { prospect_id: x.prospect_id, name: x.name, removed_at: x.removed_at, returns_at: back.toISOString() });
    }
    return { ok: true, data: [...byId.values()].sort((a, b) => b.removed_at.localeCompare(a.removed_at)) };
  } catch (e) { return fail(e); }
}

/** Let a removed business (or all of them, with no ids) show up in searches again. */
export async function allowAgain(prospectIds?: string[]): Promise<Result> {
  try {
    await (await store()).unsuppress(prospectIds);
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

/* ── Writing and logging outreach ────────────────────────────────────── */

/**
 * Write a pitch. `angle` is free text; `swipeId` picks an angle from the
 * swipe file, whose guidance and template steer the AI.
 */
export async function generatePitch(id: string, angle?: string, swipeId?: string) {
  try {
    const st = await store();
    const [p, s] = await Promise.all([st.getProspect(id), st.getSettings()]);
    if (!p) return { ok: false as const, error: "Prospect not found." };
    const sw = swipeId ? SWIPE[swipeId] : undefined;
    const steer = [
      sw && `Use the "${sw.angle}" angle (${sw.category}): ${sw.guidance} Style reference, do not copy literally — keep any [bracketed] parts the sender must fill in:\n${sw.subject}\n${sw.body}`,
      angle,
    ].filter(Boolean).join("\n\n");
    if (groqConfigured()) await meter("ai");
    const pitch = await writePitch(p, s, { angle: steer || undefined });
    return { ok: true as const, data: pitch };
  } catch (e) { return fail(e); }
}

export async function pitchFromTemplate(prospectId: string, templateId: string) {
  try {
    const st = await store();
    const [p, s, ts] = await Promise.all([st.getProspect(prospectId), st.getSettings(), st.listTemplates()]);
    const t = ts.find((x) => x.id === templateId);
    if (!p || !t) return { ok: false as const, error: "Not found." };
    return { ok: true as const, data: renderTemplate(t, p, s) };
  } catch (e) { return fail(e); }
}

/**
 * Record that a message went out. Moves a fresh lead to Contacted and books
 * the next follow-up, so nobody falls through the cracks between touches.
 */
export async function logOutreach(id: string, channel: ActivityType, summary: string, followUpInDays: number | null): Promise<Result> {
  try {
    const st = await store();
    const p = await st.getProspect(id);
    if (!p) return { ok: false, error: "Prospect not found." };
    const patch: Partial<Prospect> = {
      last_contacted_at: new Date().toISOString(),
      next_follow_up: followUpInDays == null || followUpInDays === 0 ? null : addDays(followUpInDays),
    };
    if (p.stage === "new" || p.stage === "researching") patch.stage = "contacted";
    await updateProspect(id, patch);
    await st.addActivity({ prospect_id: id, type: channel, body: summary });
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

export async function addNote(id: string, body: string): Promise<Result> {
  try {
    if (!body.trim()) return { ok: false, error: "Write something first." };
    const st = await store();
    if (!(await st.getProspect(id))) return { ok: false, error: "Prospect not found." };
    await st.addActivity({ prospect_id: id, type: "note", body: body.trim() });
    await st.updateProspect(id, {}); // bump updated_at
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

export async function snooze(id: string, days: number): Promise<Result> {
  return updateProspect(id, { next_follow_up: addDays(days) }).then((r) => (r.ok ? { ok: true as const, data: undefined } : r));
}

export async function clearFollowUp(id: string): Promise<Result> {
  return updateProspect(id, { next_follow_up: null }).then((r) => (r.ok ? { ok: true as const, data: undefined } : r));
}

/* ── Settings, views & templates ─────────────────────────────────────── */

export async function saveSettings(s: Settings): Promise<Result> {
  try {
    const st = await store();
    const current = await st.getSettings();
    // Saved views are managed separately; never let a stale settings form wipe them.
    await st.saveSettings({ ...s, saved_views: current.saved_views ?? [] });
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

export async function saveView(name: string, filters: ProspectFilters): Promise<Result<{ id: string }>> {
  try {
    if (!name.trim()) return { ok: false, error: "Name the view." };
    const st = await store();
    const s = await st.getSettings();
    const id = uid();
    await st.saveSettings({ ...s, saved_views: [...(s.saved_views ?? []), { id, name: name.trim().slice(0, 60), filters }] });
    refresh();
    return { ok: true, data: { id } };
  } catch (e) { return fail(e); }
}

export async function deleteView(id: string): Promise<Result> {
  try {
    const st = await store();
    const s = await st.getSettings();
    await st.saveSettings({ ...s, saved_views: (s.saved_views ?? []).filter((v) => v.id !== id) });
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

export async function saveTemplate(t: Omit<Template, "id" | "created_at"> & { id?: string }): Promise<Result<Template>> {
  try {
    if (!t.name.trim()) return { ok: false, error: "Name the template." };
    if (!t.body.trim()) return { ok: false, error: "The template has no message." };
    const row = await (await store()).saveTemplate(t);
    refresh();
    return { ok: true, data: row };
  } catch (e) { return fail(e); }
}

export async function deleteTemplate(id: string): Promise<Result> {
  try {
    await (await store()).deleteTemplate(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}

/* ── Passcode (personal mode) ────────────────────────────────────────── */

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  const code = String(form.get("passcode") ?? "");
  const expected = process.env.APP_PASSCODE;
  if (!expected) redirect("/");
  if (code !== expected) return { error: "That passcode isn't right." };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(expected), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  const next = String(form.get("next") || "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/* ── Sharing: mock-ups, reports, speed tests ─────────────────────────── */

async function ensureShareId(p: Prospect) {
  if (p.share_id) return p.share_id;
  const { newShareId } = await import("@/lib/store/public");
  const share_id = newShareId();
  await (await store()).updateProspect(p.id, { share_id });
  return share_id;
}

/** Save (or remove, with null) the mock-up; returns the share id for /m/[id]. */
export async function saveMockup(id: string, mockup: Mockup | null): Promise<Result<{ share_id: string }>> {
  try {
    const st = await store();
    const p = await st.getProspect(id);
    if (!p) return { ok: false, error: "Prospect not found." };
    const share_id = await ensureShareId(p);
    const had = !!p.mockup;
    await st.updateProspect(id, { mockup: mockup ? { ...mockup, updated_at: new Date().toISOString() } : null });
    if (mockup && !had) await st.addActivity({ prospect_id: id, type: "note", body: "Created a website mock-up" });
    refresh();
    return { ok: true, data: { share_id } };
  } catch (e) { return fail(e); }
}

/** Run Google PageSpeed and fold its findings into the audit. */
export async function runSpeedTest(id: string): Promise<Result<Prospect>> {
  try {
    const st = await store();
    const p = await st.getProspect(id);
    if (!p) return { ok: false, error: "Prospect not found." };
    if (!p.website) return { ok: false, error: "No website to test." };
    await meter("audits");
    const { pageSpeed, pageSpeedIssues } = await import("@/lib/pagespeed");
    const res = await pageSpeed(p.audit?.final_url || p.website);
    if (!res.ok) return { ok: false, error: res.error };
    const base = p.audit ?? (await auditWebsite(p.website));
    const extra = pageSpeedIssues(res.data).filter((i) => !base.issues.some((x) => x.id === i.id));
    const issues = [...base.issues.filter((i) => !i.id.startsWith("ps-")), ...extra];
    const opportunity = Math.min(100, issues.reduce((n, i) => n + (i.severity === "high" ? 28 : i.severity === "medium" ? 14 : 6), 0));
    const next = await st.updateProspect(id, { audit: { ...base, pagespeed: res.data, issues, opportunity } });
    await st.addActivity({ prospect_id: id, type: "audit", body: `Google speed test: ${res.data.performance}/100 on mobile` });
    refresh();
    return { ok: true, data: next! };
  } catch (e) { return fail(e); }
}

/** Make sure the report has what it needs (an audit, ideally a speed test) and a link. */
export async function prepareReport(id: string, withSpeed = true): Promise<Result<{ share_id: string; warning?: string }>> {
  try {
    const st = await store();
    let p = await st.getProspect(id);
    if (!p) return { ok: false, error: "Prospect not found." };
    if (!p.website) return { ok: false, error: "They have no website to report on — make them a mock-up instead." };
    let warning: string | undefined;
    if (!p.audit) {
      await meter("audits");
      p = (await auditOne(p)) ?? p;
    }
    if (withSpeed && !p.audit?.pagespeed && p.audit?.reachable) {
      const r = await runSpeedTest(id);
      if (!r.ok) warning = `Report ready without the Google speed test (${r.error})`;
      else p = r.data;
    }
    const share_id = await ensureShareId(p);
    refresh();
    return { ok: true, data: { share_id, warning } };
  } catch (e) { return fail(e); }
}

/* ── Kymaa documents ─────────────────────────────────────────────────── */

/** Save your edits to the website report (null = throw them away and rebuild from the check). */
export async function saveReport(id: string, doc: ReportDoc | null): Promise<Result<{ share_id: string }>> {
  try {
    const st = await store();
    const p = await st.getProspect(id);
    if (!p) return { ok: false, error: "Prospect not found." };
    const share_id = await ensureShareId(p);
    await st.updateProspect(id, { report: doc ? { ...doc, updated_at: new Date().toISOString() } : null });
    refresh();
    return { ok: true, data: { share_id } };
  } catch (e) { return fail(e); }
}

/** A new invoice, pre-filled from Settings (and the prospect, when there is one). */
export async function createInvoice(prospectId?: string | null): Promise<Result<{ id: string }>> {
  try {
    const st = await store();
    const [s, all, p] = await Promise.all([st.getSettings(), st.listInvoices(), prospectId ? st.getProspect(prospectId) : null]);
    const { defaultInvoice, nextNumber } = await import("@/lib/kymaa/invoice");
    const { newShareId } = await import("@/lib/store/public");
    const now = new Date().toISOString();
    const inv: Invoice = {
      id: uid(), share_id: newShareId(), prospect_id: p?.id ?? null,
      doc: defaultInvoice(s, nextNumber(s.invoice_prefix, all), p),
      views: 0, last_viewed_at: null, created_at: now, updated_at: now,
    };
    await st.saveInvoice(inv);
    if (p) await st.addActivity({ prospect_id: p.id, type: "note", body: `Started invoice ${inv.doc.number}` });
    refresh();
    return { ok: true, data: { id: inv.id } };
  } catch (e) { return fail(e); }
}

export async function saveInvoiceDoc(id: string, doc: InvoiceDoc, prospectId?: string | null): Promise<Result<{ share_id: string }>> {
  try {
    const st = await store();
    const inv = await st.getInvoice(id);
    if (!inv) return { ok: false, error: "Invoice not found." };
    if (!doc.number.trim()) return { ok: false, error: "The invoice needs a number." };
    const clash = (await st.listInvoices()).find((x) => x.id !== id && x.doc.number === doc.number.trim());
    if (clash) return { ok: false, error: `Invoice ${doc.number} already exists.` };
    const { totals } = await import("@/lib/kymaa/invoice");
    const wasPaid = totals(inv.doc).status === "paid";
    const next = { ...inv, doc: { ...doc, number: doc.number.trim() }, prospect_id: prospectId === undefined ? inv.prospect_id : prospectId };
    await st.saveInvoice(next);
    if (next.prospect_id && !wasPaid && totals(next.doc).status === "paid" && (await st.getProspect(next.prospect_id))) {
      await st.addActivity({ prospect_id: next.prospect_id, type: "note", body: `Invoice ${next.doc.number} paid in full` });
    }
    refresh();
    return { ok: true, data: { share_id: inv.share_id } };
  } catch (e) { return fail(e); }
}

export async function duplicateInvoice(id: string): Promise<Result<{ id: string }>> {
  try {
    const st = await store();
    const [inv, s, all] = await Promise.all([st.getInvoice(id), st.getSettings(), st.listInvoices()]);
    if (!inv) return { ok: false, error: "Invoice not found." };
    const { nextNumber, defaultInvoice } = await import("@/lib/kymaa/invoice");
    const { newShareId } = await import("@/lib/store/public");
    const fresh = defaultInvoice(s, nextNumber(s.invoice_prefix, all));
    const now = new Date().toISOString();
    const copy: Invoice = {
      ...inv, id: uid(), share_id: newShareId(), views: 0, last_viewed_at: null, created_at: now, updated_at: now,
      doc: { ...inv.doc, number: fresh.number, issuedAt: fresh.issuedAt, dueAt: fresh.dueAt, payments: [], status: "auto" },
    };
    await st.saveInvoice(copy);
    refresh();
    return { ok: true, data: { id: copy.id } };
  } catch (e) { return fail(e); }
}

export async function removeInvoice(id: string): Promise<Result> {
  try {
    await (await store()).deleteInvoice(id);
    refresh();
    return { ok: true, data: undefined };
  } catch (e) { return fail(e); }
}
