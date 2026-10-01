# Leadget

Find businesses that need what you build, see exactly what's wrong with their
website, and pitch them with an angle that fits. Lead search, website audits,
lead scoring, a swipe file of outreach angles, AI-written pitches, a pipeline
and follow-ups.

One codebase, two ways to run it:

- **Personal** (default): just you. Your data on your computer, or in your own Supabase.
- **SaaS** (`APP_MODE=saas`): anyone can sign up. Workspaces, monthly credits, plans and Paystack billing.

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Supabase · Groq · Paystack

---

## Run it (personal)

```bash
npm install
cp .env.example .env.local     # every key is optional
npm run dev                    # http://localhost:3000
```

| Without a key | With a key |
| --- | --- |
| Businesses come from **OpenStreetMap** (free, patchier) | `GOOGLE_PLACES_API_KEY`: **Google Maps** data, with websites, phones and review counts |
| Pitches come from the **swipe file and playbooks** | `GROQ_API_KEY`: pitches **written by AI**, steered by the angle you pick |
| Data is saved in `.data/leadget.json` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`: data lives in **Supabase** |
| Anyone with the URL can open it | `APP_PASSCODE`: the app is **locked** behind a passcode |

## Sending something first: reports and mock-ups

Every prospect gets a **Send them something first** panel:

- **Website report** (`/r/…`): the Kymaa website check (design from `kymaa-docs-v2`): grade, what to fix, the phone
  screenshot and Google speed, what's working, and your plan with your photo and a WhatsApp button. **Edit** changes
  every word, the grade, the order and the sign-off before you send; *Rebuild from check* goes back to the automatic
  version. Open it and use *Save as PDF* for an A4 PDF.
- **Mock-up** (`/m/…`): a one-page website for their business, pre-written for the industry, with 6 themes, all
  editable. *Save as image* makes a picture to send on WhatsApp.

Both are one link, and **opens are tracked**. Link-preview bots don't count, and neither do your own opens. Someone
who opens your link goes to the top of **Today** with a suggested follow-up.

Links only work for the prospect when Leadget is online. On your laptop, send the PDF or image. To share real links,
deploy it (Vercel + Supabase, with `APP_PASSCODE` set) and put the address in Settings → *Leadget's public address*.

## Invoices

**Invoices** (in the sidebar, or *Create invoice* on a prospect at Proposal/Won) makes Kymaa invoices: numbered
`KYM-2026-001` onwards, line items, discount, VAT, deposits and balance worked out, status Due/Overdue/Paid set
automatically. Edit on the left, live invoice on the right; *Mark as paid* records the balance. Share the `/i/…` link
(opens are tracked) or *Preview & PDF* for a one-page A4. Drafts don't open for clients.

Fill **Settings → Brand & documents** first: legal name, address, bank details, pay-online link, prefix, tax and terms.
Brand files (fonts, logo, photos) are in `public/brand/`.

## Today

`/today` is the daily routine on one screen, one lead at a time:

1. People who opened something you sent
2. Follow-ups that are due
3. Your best leads you haven't contacted yet, enough to reach your daily goal

Log a send and the next lead loads. Use → to go to the next lead and S to skip one.

## Run it as a SaaS

1. **Create a second Supabase project** (keep your personal one separate). Run `supabase/schema.sql` in its SQL editor.
   In Authentication → URL configuration, set the Site URL to your domain and add `https://YOUR-DOMAIN/auth/callback` to the redirect URLs.
   For Google sign-in, enable the Google provider and set `NEXT_PUBLIC_GOOGLE_AUTH=1`.
2. **Paystack**: create two monthly plans (Starter, Pro) and copy their plan codes. In Settings → API Keys & Webhooks,
   set the webhook URL to `https://YOUR-DOMAIN/api/billing/paystack`.
3. **Deploy a second Vercel project** from the same repo with `APP_MODE=saas` and the SaaS keys from `.env.example`.
   Your personal deployment keeps running unchanged.
4. Fill in the `[brackets]` in `app/legal/terms` and `app/legal/privacy`, and have a lawyer read them.

Prices and monthly credits are all in `lib/saas/plans.ts`.

**How tenancy works.** Every data table has a `workspace_id`. The server reads the signed-in user from their
Supabase session, finds their workspace, and `lib/store/supabase.ts` pins every query to it. That file is the
only place data is read or written. RLS is also on for every table, so the public anon key can only see its own
workspace. Credits are spent through one SQL function (`spend_credits`) that checks and increments atomically.

---

## How it's put together

```
app/(app)/            the app: overview, find, prospects, prospects/[id], pipeline, follow-ups, templates, settings, billing
app/welcome           SaaS landing page · app/signin, app/signup, app/auth/callback · app/legal/*
app/api/geo/cities    city search for the country/city pickers
app/api/billing/…     Paystack webhook (signature-verified)
lib/actions.ts        every write, as server actions; spends credits in SaaS mode
lib/store/            one interface: file.ts (local JSON) and supabase.ts (workspace-scoped)
lib/saas/             plans & credits, sessions & workspaces, auth + Paystack actions
lib/geo/              246 countries + every city of 1,000+ people (GeoNames, CC-BY 4.0)
lib/filters.ts        Apollo-style prospect filters and quick views
lib/swipe.ts          the swipe file: ~30 outreach angles for people who sell websites and apps
lib/suggest.ts        which angle to use on this lead, right now, and why
lib/render.ts         fills {{variables}}; finds the [brackets] you still need to write
lib/discover.ts       Google Places (New) + OpenStreetMap Nominatim, several cities per search
lib/audit.ts          one-page website audit → issues phrased as things to tell the owner
lib/score.ts          lead score: something to fix (40) + reachable (35) + can pay (25)
lib/pitch.ts          AI writer (Groq) and playbook writer
```

**Leadget never sends anything itself.** It opens your Gmail, Outlook, mail app or WhatsApp with the message
filled in, and you press send. It also won't open them while a `[bracket]` is still unfilled.

---

## The routine that gets clients

1. **Set up your profile** (Settings). Your name, services, and one real result under *Proof*.
2. **Pick one niche and a few cities a week.** For example, real estate in Dubai Marina and JLT, or pharmacies in Houston.
3. **Find leads, add them, audit them.** Businesses with *no website* or a *failing audit* float to the top.
4. **Use the suggested angle.** Fill in the highlighted brackets and send 10–20 personal messages a day.
5. **Follow up.** Most replies come on touches 2–5. The Follow-ups screen suggests the next angle each time.

### Staying on the right side of the rules

- Send from your own address, in small numbers, one business at a time. Keep the opt-out line and honour it.
- UK/EU (PECR/GDPR): B2B email to *corporate* addresses, relevant to their role. Don't cold-email sole traders' personal addresses.
- US (CAN-SPAM): truthful subject lines, your real identity, a working opt-out.
- Never invent results in *Proof* or in the `[brackets]`.

City data © GeoNames (geonames.org), CC-BY 4.0, via `all-the-cities`.
