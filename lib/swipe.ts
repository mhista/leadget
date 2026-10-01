/**
 * The swipe file: outreach angles that don't read like cold email.
 *
 * Every one is original to Leadget and written for people who sell websites,
 * apps and software to businesses — which is why several lean on the audit
 * ({{issue}}) or on a missing website. Fill-ins:
 *
 *   {{first_name}} {{company}} {{city}} {{country}} {{industry}} {{website}}
 *   {{issue}} {{pain}} {{offer}} {{hook}} {{reviews}}
 *   {{my_name}} {{my_business}} {{booking_link}} {{signature}}
 *
 * Anything in [square brackets] is yours to write by hand — the composer
 * counts what's left and jumps you to the next one.
 */

export type SwipeCategory =
  | "No website" | "Audit" | "Observation" | "Compliment" | "Curiosity" | "Direct" | "Permission"
  | "Problem-agitate" | "Reframe" | "Value-first" | "Quick win" | "Video" | "Social proof" | "Story"
  | "Peer" | "Local" | "Guarantee" | "Human opener" | "Underdog" | "Founder story" | "Humor" | "Urgency"
  | "Referral" | "Follow-up" | "Breakup";

export type Swipe = {
  id: string;
  category: SwipeCategory;
  angle: string;
  /** When this one works — shown on hover and used in the AI prompt. */
  guidance: string;
  channel: "email" | "whatsapp" | "linkedin";
  step: "opener" | "follow-up" | "breakup";
  subject: string;
  body: string;
};

export const SWIPES: Swipe[] = [
  /* ── No website ─────────────────────────────────────────────── */
  {
    id: "nosite-mockup", category: "No website", angle: "Offer the mock-up", step: "opener", channel: "email",
    guidance: "Business has no website. Offer a free one-page mock-up with their name on it — the lowest-risk yes there is.",
    subject: "a website for {{company}}, before you pay a thing",
    body: `Hi {{first_name}},

I looked for {{company}} online and couldn't find a website — just the listing. People in {{city}} are searching for {{industry}} businesses on their phones every day, and right now there's nothing for them to click.

So here's an easy offer: I'll build a one-page mock-up of what {{company}}'s site could look like, with your name, services and a WhatsApp button, and send it over. If you like it, we talk. If not, you keep the idea.

Want me to make it?

{{signature}}`,
  },
  {
    id: "nosite-searching", category: "No website", angle: "They're already looking for you", step: "opener", channel: "email",
    guidance: "No website but decent reviews. The demand already exists; the site just catches it.",
    subject: "{{reviews}} people found {{company}} — then what?",
    body: `Hi {{first_name}},

{{company}} has {{reviews}} reviews on Google, which means people are actively looking you up. What they find after that is a map pin and a phone number.

A simple site would let them see your services, prices and location, and message you in one tap — {{hook}}.

I build these for {{industry}} businesses. Would a 15-minute call this week be useful?

{{signature}}`,
  },

  {
    id: "mockup-link", category: "No website", angle: "Here's your mock-up", step: "opener", channel: "email",
    guidance: "You've already made their mock-up. Lead with the link — it does the selling.",
    subject: "I made {{company}} a website (preview inside)",
    body: `Hi {{first_name}},

I couldn't find a website for {{company}}, so I made you a preview of what one could look like:

{{mockup_link}}

It has your services, your location and a WhatsApp button, so customers can reach you in one tap. It's a concept — nothing's live and there's no charge for it.

If you like it, I can have the real thing running in [timeframe]. Want to talk it through?

{{signature}}`,
  },
  {
    id: "wa-mockup-link", category: "No website", angle: "WhatsApp: here's your mock-up", step: "opener", channel: "whatsapp",
    guidance: "Mock-up made, and they live on WhatsApp.",
    subject: "",
    body: `Hello {{first_name}}, I made a quick preview of a website for {{company}}: {{mockup_link}} — it's free to look at, no obligation. If you like it, I can make it real.`,
  },

  /* ── Audit ──────────────────────────────────────────────────── */
  {
    id: "report-link", category: "Audit", angle: "Here's your website report", step: "opener", channel: "email",
    guidance: "You've made their report. Send it as a no-strings gift; the grade and the phone screenshot do the talking.",
    subject: "{{company}}'s website — a quick check (free)",
    body: `Hi {{first_name}},

I ran a check on {{company}}'s website and put the results on one page — how it does on phones, Google's speed score, and what's worth fixing first:

{{report_link}}

The biggest one: {{issue}}

It's yours either way. If you'd like help with any of it, I'm around for a quick call.

{{signature}}`,
  },
  {
    id: "audit-lead", category: "Audit", angle: "Lead with the audit", step: "opener", channel: "email",
    guidance: "Their site has real problems. Open with the most serious one, in plain words, then offer the fix.",
    subject: "a quick thing on {{company}}'s website",
    body: `Hi {{first_name}},

I had a look at {{company}}'s website this morning. {{issue}}

It's a fixable problem, and usually not a big one. I help {{industry}} businesses with {{offer}}.

Happy to send over the three changes I'd make, no charge. Want them?

{{signature}}`,
  },
  {
    id: "audit-teardown", category: "Value-first", angle: "Send the teardown", step: "opener", channel: "email",
    guidance: "Give first: a short written teardown — what works, what to fix. Works on busy owners who ignore pitches.",
    subject: "3 things working, 3 to fix — {{company}}",
    body: `Hi {{first_name}},

I put together a short, honest review of {{company}}'s website: three things that are working, and three that are costing you enquiries. The biggest one: {{issue}}

It's yours either way — no call needed. Shall I send it over?

{{signature}}`,
  },

  /* ── Observation / compliment / curiosity ───────────────────── */
  {
    id: "observation", category: "Observation", angle: "Noticed something real", step: "opener", channel: "email",
    guidance: "You saw something specific — a new branch, a hiring post, a launch. Say what it usually means, then why that's the moment.",
    subject: "saw {{company}} is [doing X]",
    body: `Hi {{first_name}},

Saw that {{company}} is [specific thing you noticed — new branch, new service, hiring]. That usually means [what it tends to lead to — more enquiries, more admin, more pressure on the front desk].

That's normally when [what you build] pays for itself fastest, because [one-line reason].

If the timing's right, I'd love 15 minutes. If not, tell me when to check back.

{{signature}}`,
  },
  {
    id: "compliment", category: "Compliment", angle: "Specific, earned praise", step: "opener", channel: "email",
    guidance: "Something about the business is genuinely good (reviews, reputation, service). Praise it precisely, then show the gap.",
    subject: "not flattery, {{first_name}}",
    body: `Hi {{first_name}},

I'll be straight: [a specific thing {{company}} does well — e.g. the reviews people leave about your staff] is the reason I'm writing to you and not to anyone else in {{city}}.

The only thing that doesn't match it is online. {{issue}}

Businesses as good as yours should look it everywhere. Worth a short chat?

{{signature}}`,
  },
  {
    id: "curiosity-guess", category: "Curiosity", angle: "Make a specific guess", step: "opener", channel: "email",
    guidance: "Guess their situation from the playbook pain. If you're right, they reply; if wrong, they often correct you — also a reply.",
    subject: "a guess about {{company}}",
    body: `Hi {{first_name}},

Going to take a guess: {{pain}}.

If I'm close, that's exactly what I fix for {{industry}} businesses. If I'm way off, I'd honestly like to know what is taking up your time.

Either way, worth a reply?

{{signature}}`,
  },

  /* ── Direct / permission ───────────────────────────────────── */
  {
    id: "direct-outcome", category: "Direct", angle: "No pitch, just the outcome", step: "opener", channel: "email",
    guidance: "Short and plain. Best for busy owners and formal industries (law, finance).",
    subject: "the {{company}} version of this",
    body: `Hi {{first_name}},

Short one, because you're busy.

I help {{industry}} businesses get {{hook}} — without [the usual pain, e.g. a big agency retainer or a six-month project].

If that's worth 15 minutes, reply "yes" and I'll show you what it would look like for {{company}}. If not, no problem at all.

{{signature}}`,
  },
  {
    id: "direct-two-options", category: "Direct", angle: "Frame two choices", step: "opener", channel: "email",
    guidance: "Lay out doing nothing vs. the fix. Works when the cost of the problem is obvious.",
    subject: "two options, {{first_name}}",
    body: `Hi {{first_name}},

Two options for {{company}}:

1. Leave things as they are, and keep living with this: {{pain}}.
2. Let me build {{offer}} — up and running in [timeframe], for less than [a relatable comparison].

I'd obviously pick the second, but you know your business better than I do. Want the details?

{{signature}}`,
  },
  {
    id: "permission", category: "Permission", angle: "Make saying no easy", step: "opener", channel: "email",
    guidance: "Give them a one-word way out. Replies go up because 'later' is easy to type.",
    subject: "is this a bad time?",
    body: `Hi {{first_name}},

This may be landing at the worst possible moment, so I'll make it easy.

I help {{industry}} businesses with {{offer}}. If that's not a priority right now, reply "later" and I'll leave it for a few months.

If it is, reply "now" and I'll send a one-page outline for {{company}}.

Thanks for reading this far.

{{signature}}`,
  },

  /* ── Problem / reframe ─────────────────────────────────────── */
  {
    id: "hidden-cost", category: "Problem-agitate", angle: "Name the hidden cost", step: "opener", channel: "email",
    guidance: "The visible problem is small; the cost behind it isn't. Name the downstream loss.",
    subject: "the quiet cost at {{company}}",
    body: `Hi {{first_name}},

Most {{industry}} owners I speak to have accepted this as part of the job: {{pain}}.

The real cost isn't the problem itself. It's the customers who gave up and went elsewhere without you ever knowing they were there.

I fix exactly that. For {{company}} it would look like {{offer}}. If that's worth exploring, I'm around.

{{signature}}`,
  },
  {
    id: "reframe", category: "Reframe", angle: "It's not the problem you think", step: "opener", channel: "email",
    guidance: "They think they need more customers; they actually need to stop losing the ones who already came.",
    subject: "it's not a marketing problem",
    body: `Hi {{first_name}},

Most businesses like {{company}} think they have a "we need more customers" problem. Often it's really a "we're losing the ones who already found us" problem.

{{issue}}

If that's the case, the fix is faster and cheaper than more advertising. Want to find out which one it is?

{{signature}}`,
  },

  /* ── Give first ────────────────────────────────────────────── */
  {
    id: "quick-win", category: "Quick win", angle: "A tip they can use today", step: "follow-up", channel: "email",
    guidance: "Genuinely useful advice they can act on without you. Builds trust on touch 2 or 3.",
    subject: "steal this, {{first_name}}",
    body: `Hi {{first_name}},

Something you can use whether we ever work together or not: [one concrete tip for {{company}} — e.g. add a WhatsApp button to your Google Business profile; it takes two minutes].

That alone should [small, believable result]. If you'd like the full version of what I'd do for {{company}}, just say so.

{{signature}}`,
  },
  {
    id: "video", category: "Video", angle: "Show, don't tell", step: "follow-up", channel: "email",
    guidance: "Record a 2–3 minute screen recording walking through their actual site. Replies jump when they see their own business.",
    subject: "2-minute video for {{company}}",
    body: `Hi {{first_name}},

Instead of another wall of text, I recorded a quick walkthrough of {{company}}'s website and exactly what I'd change. It's about your site, not a generic demo.

[video link]

If it's useful, reply and we'll take it from there. If not, no worries — it was fun to make.

{{signature}}`,
  },

  /* ── Proof ─────────────────────────────────────────────────── */
  {
    id: "social-proof", category: "Social proof", angle: "Before and after", step: "opener", channel: "email",
    guidance: "Only with a real result you can name. Never invent numbers.",
    subject: "how [a similar business] got [result]",
    body: `Hi {{first_name}},

[A similar business — e.g. a law firm in Lagos] came to me with [the before — e.g. a site that didn't work on phones]. Within [timeframe] they had [the after — e.g. enquiries coming in through a proper intake form].

Same kind of business as {{company}}. The fix wasn't complicated, just done properly.

Are you the right person to talk to about this, or is there someone else I should reach?

{{signature}}`,
  },
  {
    id: "local-competitor", category: "Local", angle: "Your competitors are online", step: "opener", channel: "email",
    guidance: "Competitors nearby already have good sites or booking. Not scare tactics — just what customers compare.",
    subject: "what customers see when they compare",
    body: `Hi {{first_name}},

When someone in {{city}} searches for a {{industry}} business, they compare two or three options in about a minute. A few of your neighbours already let people [book / order / enquire] online in one tap.

I'd rather {{company}} be the easy choice than the one that needs a phone call.

I can show you exactly what I'd put in place. 15 minutes this week?

{{signature}}`,
  },
  {
    id: "story", category: "Story", angle: "This reminds me of someone", step: "opener", channel: "email",
    guidance: "A short, true story about a similar client. Specific beats impressive.",
    subject: "reminds me of [a similar business]",
    body: `Hi {{first_name}},

A while back I worked with [a business a lot like {{company}}]. Same [situation], same [struggle].

We changed one thing: [the change]. Within [timeframe], [what happened].

I'm not assuming you have the same problem. But if any of that sounds familiar, I'd love to show you what we did.

{{signature}}`,
  },

  /* ── Relationship ──────────────────────────────────────────── */
  {
    id: "peer", category: "Peer", angle: "One owner to another", step: "opener", channel: "email",
    guidance: "Works with owner-operators. Talk as a fellow small-business owner, not a vendor.",
    subject: "one business owner to another",
    body: `Hi {{first_name}},

I run a small business too, so I know what it's like to be doing sales, operations and the accounts before lunch.

The one job I'd take off your plate is the online side: {{offer}}. I'd handle it end to end so you get {{hook}}.

I'm not after a huge contract. Could {{company}} be a good fit?

{{signature}}`,
  },
  {
    id: "human", category: "Human opener", angle: "Admit it's a cold email", step: "opener", channel: "email",
    guidance: "Disarming honesty. Good when you have no named contact or no specific hook.",
    subject: "yes, this is a cold email",
    body: `Hi {{first_name}},

This is a cold email and we both know it, so I'll be a real person about it.

I build [websites / apps] for {{industry}} businesses, and after looking at {{company}} I think I can genuinely help with [one specific thing].

If I'm off base, tell me and I'll leave you alone. If not, 15 minutes?

{{signature}}`,
  },
  {
    id: "referral", category: "Referral", angle: "Borrowed trust", step: "opener", channel: "email",
    guidance: "Only when someone real pointed you to them.",
    subject: "{{first_name}}, [mutual name] suggested I get in touch",
    body: `Hi {{first_name}},

[Mutual name] mentioned you're the person to speak to about [area] at {{company}}, and that you don't have time for fluff. So I'll keep it short.

I help {{industry}} businesses with {{offer}}. [Mutual name] thought it might be relevant.

Worth a quick call, or shall I send the short version by email first?

{{signature}}`,
  },

  /* ── Offers ────────────────────────────────────────────────── */
  {
    id: "guarantee", category: "Guarantee", angle: "Pay when it's live", step: "opener", channel: "email",
    guidance: "Take the risk off them: a deposit, the balance only on launch. Use only what you'll honour.",
    subject: "you only pay the balance when it's live",
    body: `Hi {{first_name}},

Simple offer: I'll build {{offer}} for {{company}}. You pay [a small deposit] to start, and the rest only when it's live and you're happy with it.

No long contract, no surprise invoices.

I wouldn't put it that way if I wasn't confident. Want the details?

{{signature}}`,
  },
  {
    id: "underdog", category: "Underdog", angle: "One person, fully committed", step: "opener", channel: "email",
    guidance: "You're small and hungry. Say it plainly and offer a small first step.",
    subject: "betting on myself, {{first_name}}",
    body: `Hi {{first_name}},

I'm not a big agency with a glossy deck. I'm one developer who's very good at [your skill] and will treat {{company}} like my only client.

Here's the trade: give me [a small first project] for [a fair price]. If I don't earn the next step, we shake hands and part ways.

I've already sketched [something concrete — e.g. the homepage layout for {{company}}]. Want to see it?

{{signature}}`,
  },
  {
    id: "founder-story", category: "Founder story", angle: "Why you do this", step: "opener", channel: "email",
    guidance: "Your honest reason for doing this work. Keep it to two sentences.",
    subject: "why I do this",
    body: `Hi {{first_name}},

I started building for {{industry}} businesses because I kept watching great ones lose customers to worse competitors who were simply easier to find online.

That still bugs me. If {{hook}} matters to {{company}}, I'd genuinely love to help. If not, no worries at all.

{{signature}}`,
  },
  {
    id: "humor", category: "Humor", angle: "A friendly bet", step: "opener", channel: "email",
    guidance: "Light and confident. Skip for law, finance and healthcare.",
    subject: "a slightly ridiculous offer",
    body: `Hi {{first_name}},

Slightly ridiculous offer: give me [two weeks] to [a specific result] for {{company}}. If it works, we keep going. If it doesn't, I'll [a playful forfeit — buy the whole team lunch] and never email you again.

I like those odds. Do you?

{{signature}}`,
  },
  {
    id: "urgency", category: "Urgency", angle: "Real lead time", step: "opener", channel: "email",
    guidance: "Only a real deadline: a season, a launch, a peak month. Never fake scarcity.",
    subject: "before [the busy season]",
    body: `Hi {{first_name}},

If you want {{offer}} in place before [a real deadline — e.g. the December rush], now is the time to start, because a proper build takes [timeframe] to get right.

I can have {{company}} up and running by [date]. Happy to show you the plan.

Quick chat this week?

{{signature}}`,
  },

  /* ── Follow-ups ────────────────────────────────────────────── */
  {
    id: "after-open", category: "Follow-up", angle: "Any thoughts on it?", step: "follow-up", channel: "email",
    guidance: "They've opened your report or mock-up. Follow up now, while it's fresh — but don't mention tracking.",
    subject: "Re: {{company}}",
    body: `Hi {{first_name}},

Did you get a chance to look at what I sent over? Happy to walk you through it in 10 minutes, or answer anything by email — whatever's easier.

{{my_name}}`,
  },
  {
    id: "bump-short", category: "Follow-up", angle: "The one-line bump", step: "follow-up", channel: "email",
    guidance: "Touch 2, 3–4 days after the first. One line, same thread.",
    subject: "Re: {{company}}",
    body: `Hi {{first_name}}, just bumping this in case it got buried — still happy to send over the mock-up for {{company}}.

{{my_name}}`,
  },
  {
    id: "bump-new-angle", category: "Follow-up", angle: "Add one new thing", step: "follow-up", channel: "email",
    guidance: "Touch 3. Don't repeat yourself — bring something new: a second finding, an idea, a result.",
    subject: "one more idea for {{company}}",
    body: `Hi {{first_name}},

One more idea, then I'll stop: [a second, different thing you'd improve for {{company}}].

For most {{industry}} businesses the win is simple — this fixes "{{pain}}".

Worth a quick look?

{{my_name}}`,
  },
  {
    id: "breakup", category: "Breakup", angle: "Graceful last touch", step: "breakup", channel: "email",
    guidance: "Touch 4 or 5. Close the loop kindly — breakup emails often get the most replies.",
    subject: "closing the loop, {{first_name}}",
    body: `Hi {{first_name}},

I've reached out a couple of times without hearing back, which usually means the timing's off — or I didn't make it worth your while.

Either way, I'll stop here so I'm not that person in your inbox. If {{hook}} becomes a priority for {{company}}, just reply to this and I'll pick it up.

All the best,
{{my_name}}`,
  },

  /* ── Short channels ────────────────────────────────────────── */
  {
    id: "wa-opener", category: "Audit", angle: "WhatsApp opener", step: "opener", channel: "whatsapp",
    guidance: "Short, friendly, one ask. For businesses that live on WhatsApp.",
    subject: "",
    body: `Hi {{first_name}}, {{my_name}} here. {{issue}} I build {{industry}} sites with {{hook}}. Can I send you a quick free mock-up?`,
  },
  {
    id: "wa-nosite", category: "No website", angle: "WhatsApp: no website", step: "opener", channel: "whatsapp",
    guidance: "No website, has WhatsApp. The most common case for local businesses.",
    subject: "",
    body: `Hello {{first_name}}, I came across {{company}} and noticed you don't have a website yet. I'd like to make you a free one-page preview with your services and a WhatsApp button — no obligation. Shall I?`,
  },
  {
    id: "li-connect", category: "Peer", angle: "LinkedIn connection note", step: "opener", channel: "linkedin",
    guidance: "Under 300 characters. No pitch in the note — just a reason to connect.",
    subject: "",
    body: `Hi {{first_name}}, I work with {{industry}} businesses in {{country}} on {{offer}}. Would be good to connect.`,
  },
];

export const SWIPE = Object.fromEntries(SWIPES.map((s) => [s.id, s])) as Record<string, Swipe>;
export const SWIPE_CATEGORIES = [...new Set(SWIPES.map((s) => s.category))];
