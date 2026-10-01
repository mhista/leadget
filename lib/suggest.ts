import type { Prospect } from "@/lib/types";
import { SWIPE, type Swipe } from "@/lib/swipe";

/**
 * Which angle to use on this lead, right now.
 *
 * Reads what Leadget knows — no website, what the audit found, reviews, who
 * the contact is, how many times you've already written — and ranks the
 * swipe file. Every suggestion carries its reason so it's never a mystery.
 */

export type Suggestion = { swipe: Swipe; reason: string };

const FORMAL = new Set(["law", "finance", "clinic", "dental"]);

export function suggestAngles(p: Prospect, touches = 0, limit = 3): Suggestion[] {
  const out: Suggestion[] = [];
  const add = (id: string, reason: string) => {
    if (SWIPE[id] && !out.some((s) => s.swipe.id === id)) out.push({ swipe: SWIPE[id], reason });
  };

  if (["won", "lost"].includes(p.stage)) return [];
  if (["replied", "meeting", "proposal"].includes(p.stage)) {
    add("direct-two-options", "They're engaged — make the next step a simple choice");
    add("social-proof", "Back the conversation with a real result");
    return out.slice(0, limit);
  }

  // They opened a link you sent: the hottest moment there is.
  const openedRecently = p.last_viewed_at && Date.now() - new Date(p.last_viewed_at).getTime() < 3 * 86400000;
  if (openedRecently && touches > 0) add("after-open", `They opened your link ${agoWords(p.last_viewed_at!)} — follow up now`);

  // Follow-up sequence by touch count.
  if (touches >= 4) add("breakup", `Touch #${touches + 1} — close the loop; breakups get replies`);
  else if (touches === 3) { add("bump-new-angle", "Touch #4 — bring something new"); add("breakup", "Or close the loop now"); }
  else if (touches === 2) { add("video", "Touch #3 — show them their own site on video"); add("bump-new-angle", "Add a second idea"); }
  else if (touches === 1) { add("bump-short", "Touch #2 — a one-line bump in the same thread"); add("quick-win", "Or give a tip they can use today"); }

  // Openers.
  const issues = p.audit?.issues ?? [];
  const high = issues.filter((i) => i.severity === "high").length;
  if (touches === 0 && p.mockup) add(p.phone && !p.email ? "wa-mockup-link" : "mockup-link", "Your mock-up is ready — send the link");
  if (touches === 0 && p.audit && p.share_id && p.website) add("report-link", "Your report is ready — send it as a free gift");
  if (!p.website) {
    add("nosite-mockup", "No website — a free mock-up is the easiest yes");
    if ((p.reviews ?? 0) >= 10) add("nosite-searching", `${p.reviews} reviews but nowhere to click`);
    if (p.phone && !p.email) add("wa-nosite", "Only a phone number — open on WhatsApp");
    add("local-competitor", "Customers compare them with competitors who are online");
  } else if (p.audit && !p.audit.reachable) {
    add("audit-lead", "Their site isn't loading — tell them first");
  } else if (high >= 1) {
    add("audit-lead", `The audit found ${high} serious issue${high === 1 ? "" : "s"}`);
    add("audit-teardown", "Give the teardown first — no call needed");
    add("video", "Walk through their site on a short video");
  } else if (issues.length) {
    add("reframe", "Small issues — frame it as losing customers who already found them");
    add("audit-teardown", "Give first with a short teardown");
  } else if (!p.audit) {
    add("curiosity-guess", "Not audited yet — guess the usual pain (or audit first)");
  }

  if ((p.reviews ?? 0) >= 50 || (p.rating ?? 0) >= 4.5) add("compliment", "Strong reviews — earned praise opens doors");
  if (!p.contact_name) add("human", "No named contact — be disarmingly honest");
  if (FORMAL.has(p.industry)) add("direct-outcome", "Formal industry — short and plain works best");
  if (!p.email && p.phone) add("wa-opener", "No email — WhatsApp is the way in");
  if (["solo", "small"].includes(p.size)) add("peer", "Owner-run business — talk owner to owner");
  add("permission", "Easy to reply to");
  add("hidden-cost", "Name what the problem really costs");

  return out.slice(0, limit);
}

function agoWords(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
