import "server-only";
import type { Pitch, Prospect, Settings, Template } from "@/lib/types";
import { playbook } from "@/lib/industries";
import { groqChat, groqConfigured } from "@/lib/ai/groq";
import { firstName, signOff } from "@/lib/render";

/**
 * Writes the first message and its follow-ups for one prospect.
 *
 * The rule both writers follow: say one specific, true thing about THIS
 * business, offer one relevant fix, ask for one small next step. A cold
 * message that could have been sent to anyone gets treated like it was.
 *
 * With a Groq key the AI writes it from the same facts; without one (or if
 * Groq fails) the playbook writer below does, so there is always a draft.
 */

export async function writePitch(p: Prospect, s: Settings, opts: { angle?: string } = {}): Promise<Pitch & { warning?: string }> {
  if (groqConfigured()) {
    const ai = await aiPitch(p, s, opts.angle);
    if (ai.ok) return ai.pitch;
    return { ...playbookPitch(p, s), warning: `AI draft unavailable (${ai.error}) — used the playbook instead.` };
  }
  return playbookPitch(p, s);
}

/* ── Facts, shared by both writers ───────────────────────────────────── */

function facts(p: Prospect, s: Settings) {
  const pb = playbook(p.industry);
  const issues = p.audit?.issues ?? [];
  const top = [...issues].sort((a, b) => rank(a.severity) - rank(b.severity)).slice(0, 2);
  const first = firstName(p.contact_name);
  return { pb, issues, top, first };
}
const rank = (s: string) => (s === "high" ? 0 : s === "medium" ? 1 : 2);


const where = (p: Prospect) => p.city || p.country;

/* ── Playbook writer ─────────────────────────────────────────────────── */

export function playbookPitch(p: Prospect, s: Settings): Pitch {
  const { pb, top, first } = facts(p, s);
  const hi = first ? `Hi ${first},` : s.tone === "formal" ? "Good day," : "Hi there,";
  const me = s.your_name ? `I'm ${s.your_name}${s.business_name ? ` from ${s.business_name}` : ""}` : "I'm a developer";
  const offer = pb.offers[0].charAt(0).toLowerCase() + pb.offers[0].slice(1);

  let observation: string;
  let subject: string;
  if (!p.website) {
    observation = `I was looking at ${pb.label.toLowerCase()} businesses${where(p) ? ` in ${where(p)}` : ""} and noticed ${p.name} doesn't have a website yet${p.reviews ? `, even though you have ${p.reviews} reviews on Google — people clearly already look for you` : ""}.`;
    subject = `${p.name} — a website for the people already searching for you`;
  } else if (top.length) {
    observation = `I had a look at ${p.name}'s website and noticed a couple of things. ${top.map((i) => i.pitch).join(" ")}`;
    subject = top[0].id === "down" ? `${p.name}'s website isn't loading` : `A couple of quick things on ${p.name}'s website`;
  } else {
    observation = `I came across ${p.name}${where(p) ? ` in ${where(p)}` : ""} and had a look at your website.`;
    subject = `An idea for ${p.name}`;
  }

  const proof = s.proof.trim() ? `\n\n${s.proof.trim()}` : "";
  const cta = s.booking_link
    ? `Would a 15-minute call be useful? You can pick a time here: ${s.booking_link}`
    : "Would a 15-minute call next week be useful? Happy to send a quick mock-up first so you can see what I mean — no charge.";

  const body = [
    hi,
    "",
    observation,
    "",
    `${me}. I help ${pb.label.toLowerCase()} businesses with ${offer} — ${pb.hook}.${proof}`,
    "",
    cta,
    "",
    "Thanks,",
    signOff(s),
    "",
    "P.S. If this isn't relevant, just reply “no thanks” and I won't follow up.",
  ].join("\n");

  const whatsapp = [
    `${hi.replace(/,$/, "")} — ${s.your_name ? `${s.your_name} here` : "quick message"}.`,
    !p.website
      ? `I noticed ${p.name} doesn't have a website yet. I build ${pb.label.toLowerCase()} sites with ${pb.hook}.`
      : top.length
        ? `I checked ${p.name}'s website: ${top[0].pitch.charAt(0).toLowerCase() + top[0].pitch.slice(1)}`
        : `I work with ${pb.label.toLowerCase()} businesses on ${offer}.`,
    "Can I send you a quick mock-up of what I'd suggest? Free, no obligation.",
  ].join(" ");

  const followups = [
    {
      day: 3,
      subject: `Re: ${subject}`,
      body: `${hi}\n\nJust bumping this in case it got buried. ${!p.website ? "Happy to put together a one-page mock-up for " + p.name + " so you can see it before deciding anything." : "Happy to send a short screen recording walking through what I noticed on the site."}\n\nThanks,\n${s.your_name || ""}`.trim(),
    },
    {
      day: 7,
      subject: `An idea for ${p.name}`,
      body: `${hi}\n\nOne concrete idea: ${pb.offers[1] ?? pb.offers[0]}. For most ${pb.label.toLowerCase()} businesses the win is simple — ${pb.pains[0].charAt(0).toLowerCase() + pb.pains[0].slice(1)}, and this fixes it.\n\nWorth a quick chat?\n\n${s.your_name || ""}`.trim(),
    },
    {
      day: 14,
      subject: `Closing the loop`,
      body: `${hi}\n\nI'll leave it here so I'm not filling your inbox. If improving ${p.website ? "the website" : "your online presence"} becomes a priority later, just reply to this and I'll pick it up.\n\nAll the best,\n${s.your_name || ""}`.trim(),
    },
  ];

  return { subject, body, whatsapp, followups, by: "playbook" };
}

/* ── AI writer ───────────────────────────────────────────────────────── */

async function aiPitch(p: Prospect, s: Settings, angle?: string): Promise<{ ok: true; pitch: Pitch } | { ok: false; error: string }> {
  const { pb, issues, first } = facts(p, s);

  const context = {
    sender: {
      name: s.your_name, business: s.business_name, role: s.role, website: s.website,
      services: s.services, proof: s.proof, booking_link: s.booking_link, tone: s.tone,
    },
    prospect: {
      business: p.name, industry: pb.label, city: p.city, country: p.country,
      contact_first_name: first || null, contact_role: p.contact_role || null,
      has_website: !!p.website, website: p.website || null,
      google_rating: p.rating, google_reviews: p.reviews, size: p.size || null, notes: p.notes || null,
      audit_findings: issues.map((i) => ({ severity: i.severity, finding: i.pitch })),
      platform: p.audit?.platform ?? null,
    },
    industry_knowledge: { common_pains: pb.pains, offers_that_fit: pb.offers, hook: pb.hook },
    requested_angle: angle || null,
  };

  const system = `You write cold outreach for a freelance software developer. You write like a thoughtful human, not a marketer.

Rules:
- The first email is 70–130 words. Plain text. No emojis, no bullet lists, no exclamation marks, no "I hope this finds you well".
- Open with ONE specific, true observation about this business, taken only from the facts given (audit findings, missing website, reviews). Never invent facts, numbers, clients or results. If the sender gave no proof, don't claim any.
- Offer ONE relevant fix from offers_that_fit, framed as the outcome for the business.
- End with a low-effort call to action (a 15-minute call, or offering a free mock-up). Use the booking link if provided.
- Sign off with the sender's name and business. Add a final P.S. line telling them to reply "no thanks" and you won't follow up.
- Match the sender's tone: warm, direct or formal.
- Address the contact by first name if given, else "Hi there" (or "Good day" if formal).
- Write in English suitable for the prospect's country.
- whatsapp: under 45 words, friendly, no sign-off block.
- followups: exactly 3 — day 3 (short bump, adds one useful thing), day 7 (a different concrete idea), day 14 (polite close-the-loop). Each under 70 words.

Return JSON only: {"subject": string, "body": string, "whatsapp": string, "followups": [{"day": number, "subject": string, "body": string}]}`;

  const res = await groqChat({
    json: true,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(context) },
    ],
  });
  if (!res.ok) return res;
  try {
    const j = JSON.parse(res.text);
    if (typeof j.subject !== "string" || typeof j.body !== "string") throw new Error("shape");
    return {
      ok: true,
      pitch: {
        subject: j.subject.trim(),
        body: j.body.trim(),
        whatsapp: String(j.whatsapp ?? "").trim(),
        followups: Array.isArray(j.followups)
          ? j.followups.slice(0, 3).map((f: any, i: number) => ({ day: Number(f.day) || [3, 7, 14][i], subject: String(f.subject ?? ""), body: String(f.body ?? "") }))
          : [],
        by: "ai",
      },
    };
  } catch {
    return { ok: false, error: "the AI answer wasn't in the expected format" };
  }
}

export { renderTemplate, TEMPLATE_VARS } from "@/lib/render";
