import { NextResponse } from "next/server";
import { loadShared, loadSharedInvoice, recordInvoiceView, recordView } from "@/lib/store/public";

/**
 * Counts an open of a shared report or mock-up. Called from the page's own
 * script after a moment on the page — link-preview bots (WhatsApp, Gmail,
 * Slack) fetch the HTML but don't run scripts, so they don't count.
 */
export async function POST(req: Request) {
  try {
    const { id, kind } = await req.json();
    if (typeof id !== "string" || !["report", "mockup", "invoice"].includes(kind)) return NextResponse.json({ ok: false }, { status: 400 });
    if (kind === "invoice") {
      const inv = await loadSharedInvoice(id);
      if (!inv) return NextResponse.json({ ok: false }, { status: 404 });
      await recordInvoiceView(inv.st, inv.inv);
      return NextResponse.json({ ok: true });
    }
    const found = await loadShared(id);
    if (!found) return NextResponse.json({ ok: false }, { status: 404 });
    await recordView(found.st, found.p, kind);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
