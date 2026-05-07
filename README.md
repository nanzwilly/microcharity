# MicroCharity — Website Rebuild (Next.js)

Crowdfunding portal rebuild for [www.microcharity.com](https://www.microcharity.com).

## Stack

- **Next.js 15** (App Router, RSC, server actions)
- **Tailwind CSS 4** (CSS-first theming via `@theme`)
- **Manrope** + **Fraunces** (Google Fonts)
- **TypeScript**

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Layout

```
app/
  layout.tsx              # root html shell + header/footer
  page.tsx                # home
  who-we-are/page.tsx
  how-we-work/page.tsx
  current-causes/page.tsx
  donations/[slug]/       # cause detail with timeline + donate sidebar
  refer-a-cause/
  contact-us/
  legal-financial/
  success-stories/
  terms-conditions/
  privacy-policy/
  refund-policy/
  admin/                  # admin route group (stubbed)
  api/
    contact/              # contact form submission
    refer-cause/          # cause referral submission
    donate/online/        # Razorpay order creation (stub)
    donate/offline/       # offline donation form (stub)
    razorpay/webhook/     # Razorpay webhook (stub)

components/               # Header, Footer, CauseCard, PageHero
lib/data/                 # site, team, causes (scraped JSON)
public/                   # logo, favicon, team photos
scripts/scrape-causes.mjs # one-off scraper for the legacy live site
```

## Brand

White / red / black, modelled on the existing wordmark.

- Accent red: `--color-accent-600` (#cc2222)
- Ink: `--color-ink` (#1d1a1a)
- Body: `--color-body`
- Display headings: Fraunces · Body: Manrope

## Migration status (against MicroCharity SRS v1.0)

**Done — public-facing portal**

- All static pages migrated with copy from the live site
- Cause detail pages (123 of them) with real timeline content
- Beneficiary nesting (e.g. one beneficiary, multiple campaigns over years)
- Mobile-responsive
- Refer-a-Cause and Contact forms (stubbed `/api` endpoints)

**Pending — admin / data / integrations**

- PostgreSQL + Prisma schema
- Admin auth (Admin + Content Manager roles)
- Cause CMS (WYSIWYG, multi-image upload, publish workflow)
- Razorpay payment gateway
- Gmail for Business email queue
- PDF receipt generation
- Donor management + cumulative 80G receipts
- Email campaigns
- Reports

See [`app/admin/page.tsx`](app/admin/page.tsx) for the build order.

## Re-scraping causes

If the legacy site's content changes:

```bash
npm run scrape:causes
```

Output: `lib/data/causes-grouped.json`, `lib/data/causes-scraped.json`.

## `legacy-astro/`

The previous Astro implementation is preserved here as a reference until the Next.js port is fully validated. Safe to delete once the new build is in production.
