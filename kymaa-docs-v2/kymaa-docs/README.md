# Kymaa document templates: website check report + invoice

These are two branded, data-driven templates for the Kymaa lead tool. Each one is a single self-contained HTML file.

- To make a document, put a JSON object in it. A tiny script inside the file renders the page.
- There's no build step and no dependencies apart from Google Fonts.
- Both templates are responsive for phones, and print cleanly to A4 (Ctrl/Cmd+P → Save as PDF).

| File | What it is |
|---|---|
| `kymaa-report.html` | Website check report, filled with a sample (G Builders NYC) |
| `kymaa-invoice.html` | Invoice, filled with a sample |
| `report.sample.json` | The report's sample data, on its own |
| `invoice.sample.json` | The invoice's sample data, on its own |
| `preview-report.png`, `preview-invoice.png` | What each template renders to |
| `sample-report.pdf`, `sample-invoice.pdf` | The samples saved as PDF |
| `brand/logo/` | Wordmark and K mark in SVG + transparent PNG (navy, ink, light); favicon, app icons, social card |
| `brand/fonts/` | Self-hosted font files (Archivo variable, Instrument Serif italic, Geist, Geist Mono) |
| `brand/photos/` | Team portraits (Diwe Innocent, Jeremiah Ndubuisi) for the report's `preparer.photo` |
| `brand/kymaa-tokens.css` / `.json` | Colours, fonts and shapes as CSS variables / JSON |

---

## How to use them

**Option A: keep them as HTML (simplest)**
1. Open the template.
2. Find the `<script type="application/json" id="report-data">` block (for the invoice, `id="invoice-data"`).
3. Replace the JSON inside it with the new data.
4. Serve the file, or save it as a PDF.

**Option B: port them into the lead app (React / Next.js / Astro…)**

Keep the markup, class names and CSS exactly as they are. Replace the small renderer script with your framework's rendering, using the same JSON shape. The renderer is plain JavaScript, so it maps one-to-one onto components.

**Rules for the app wrapper**
- Your app's own toolbar (back, copy share link, save as PDF, "preview — not counted as a view") must sit **outside** the `.sheet` element and must not overlap it.
- Hide the toolbar with `@media print { … display: none }`.
- Keep `<meta name="robots" content="noindex">`, because reports are private to each prospect.
- A "Save as PDF" button only needs to call `window.print()`. The print CSS already sets up A4.

---

## Report data (`#report-data`)

```jsonc
{
  "checkedAt": "2026-09-30",            // ISO date of the check
  "business": {
    "name": "G Builders NYC",           // shown large on the cover
    "domain": "gbuilders.com",          // shown under the name
    "url": "https://gbuilders.com"
  },
  "grade": "D",                         // A | B | C | D | F (see grading below)
  "verdict": "Needs work",              // optional; defaults by grade (see below)
  "summary": "We found 5 things that could be costing G Builders NYC customers, and 3 that are working well.",
  "checksTotal": 8,                     // optional; defaults to issues + wins
  "issues": [                           // ordered by how much each one costs the business
    {
      "title": "Not built for phones",
      "impact": "high",                 // high | medium | low
      "why": "One or two plain sentences on the business cost.",
      "fix": "One sentence on what we'd do."
    }
  ],
  "wins": [ { "title": "Secure connection", "detail": "Padlock shown in the browser" } ],
  "recommendations": [                  // strings, or objects with title + detail
    { "title": "A portfolio site that wins tenders", "detail": "One line on the outcome." }
  ],
  "planTitle": "What I’d do for G Builders NYC",   // optional; this is the default
  "preparer": {
    "name": "Diwe Innocent",
    "role": "Kymaa · kymaa.tech",
    "photo": ""                         // optional image URL (a square crop works best)
  },
  "cta": {
    "primary":   { "label": "Talk to me about it", "url": "https://wa.me/2347068884102?text=..." },
    "secondary": { "label": "Book a free call",    "url": "https://kymaa.tech/contact/" }  // optional
  }
}
```

**Grading** (a suggestion for the AI to apply consistently):

| Share of checks passed | Grade | Default verdict | Tile colour |
|---|---|---|---|
| 90% or more | A | In great shape | Signal blue |
| 75% or more | B | Solid, with gaps | Navy |
| 60% or more | C | Room to improve | Amber |
| 40% or more | D | Needs work | Ember |
| under 40% | F | Needs urgent work | Deep red |

If any single issue is a hard failure (the site is down, or it has no HTTPS), cap the grade at D.

**Impact levels:**
- `high`: directly loses enquiries or trust (not mobile-friendly, no way to contact, the site looks abandoned, broken pages).
- `medium`: hurts how the business is found or how it looks (no search description, slow pages, missing social preview).
- `low`: good practice (analytics, favicon, minor SEO).

**Copy rules for the AI**
- Write for a business owner, not a developer: plain words and short sentences.
- **Why:** say what it costs them ("so many don't"), not how it works technically.
- **The fix:** give one concrete action, starting with a verb.
- Only state numbers you actually measured, such as load time. Never estimate traffic or revenue.
- Keep 3–7 issues and 2–6 wins. Recommendations should be 2–4 items specific to their industry, never generic.

---

## Invoice data (`#invoice-data`)

```jsonc
{
  "number": "KYM-2026-014",
  "issuedAt": "2026-09-30",
  "dueAt": "2026-10-14",
  "reference": "Website redesign",      // project name or PO number
  "status": "auto",                     // auto | due | overdue | paid | draft
  "currency": "NGN",                    // any ISO code: NGN, USD, GBP, EUR…
  "locale": "en-NG",                    // number formatting (en-US, en-GB…)
  "from":   { "name": "Kymaa", "legalName": "Kymaa Digital Solutions", "email": "solutions@kymaa.online", "phone": "+234 706 888 4102", "address": ["Lagos, Nigeria"] },
  "client": { "name": "G Builders NYC", "contact": "Attn: …", "email": "…", "address": ["New York, NY", "United States"] },
  "items": [ { "title": "Website design", "detail": "Optional one-line scope", "qty": 1, "rate": 450000 } ],
  "discount": { "label": "Early start", "type": "percent", "value": 5 },   // optional; type: percent | amount
  "tax": { "label": "VAT", "rate": 7.5 },                                   // optional
  "payments": [ { "label": "Deposit received", "date": "2026-09-30", "amount": 600000 } ],  // optional
  "payment": { "bank": "…", "accountName": "…", "accountNumber": "…", "swift": "", "link": "https://…" },
  "terms": "Multi-line text is fine.\nLike this.",
  "notes": "Optional."
}
```

**Computed automatically:**
- Line amounts: qty × rate.
- Subtotal, then the discount, then tax on the discounted amount, then the total.
- Payments are subtracted to give the **balance due**.
- Status (`auto`) shows **Paid** when the balance is 0, **Overdue** when the due date has passed, and **Payment due** otherwise.
- When the invoice is paid, the "How to pay" block hides and a "Paid in full" note appears.

⚠️ **Replace the bank placeholders** (`[Bank name]`, `[Account number]`) with the real details in your lead app's settings. Don't hard-code them into the template.

An invoice with up to about 5 line items fits on one A4 page. Longer invoices continue onto a second page.

---

## Brand assets

- **Logo on light backgrounds:** `kymaa-wordmark-navy.svg`. **On navy/dark:** `kymaa-wordmark-light.svg`. The blue corner stays `#0678FF` in every version; never recolour it or stretch the mark.
- **Small spaces / avatars:** the K mark (`kymaa-mark-*.svg`). Favicon and app icons are ready-made.
- The templates embed the wordmark inline, so they don't need these files to render. Use the files for the lead app UI, emails and anything else.
- **Fonts:** the templates load them from Google Fonts. If the lead app self-hosts, `kymaa-tokens.css` already has the `@font-face` rules pointing at `brand/fonts/`. Swap the Google Fonts `<link>` for that stylesheet.
- **Photos:** host the portrait somewhere public and put its URL in `preparer.photo`. The report shows it next to the name, cropped with the cut corner.

## Brand (from the Kymaa design system, "The Cut")

| Token | Value | Use |
|---|---|---|
| Bone / Paper | `#F2F0EA` / `#F7F5F0` | Page and sheet |
| Ink | `#0B1726` | Text |
| Ink 2 | `#4A5566` | Secondary text |
| Kymaa Navy | `#00244E` | Report cover, plan block, balance due |
| Signal Blue | `#0678FF` | Blue corner marker, slash. Use sparingly. |
| Signal (text) | `#0060DF` | Small blue text (passes contrast) |
| Sky / Mist | `#5AA8FF` / `#9DB0C8` | Accent and secondary text on navy |
| Ember / Amber | `#C2410C` / `#9A6700` | High and medium impact labels only |

- **Type:** Archivo Expanded (headlines), Instrument Serif Italic (one word per headline), Geist (body), Geist Mono (labels).
- **Shapes:** a 45° cut corner on key blocks, the blue triangle before section labels, and hairline rules instead of rounded cards.

---

## Prompt you can give your AI

> Use `kymaa-report.html` / `kymaa-invoice.html` as the exact visual templates. Don't change the markup, class names or CSS.
>
> For each website check, produce a JSON object that matches `report.sample.json` and follows the grading, impact and copy rules in README.md.
>
> For invoices, produce JSON that matches `invoice.sample.json`, and let the template compute totals and status.
>
> Render by replacing the JSON in the `<script type="application/json">` block, or by porting the renderer into our app with the same JSON shape.
