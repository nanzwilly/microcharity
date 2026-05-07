# MicroCharity — Website Rebuild

Static site rebuild of www.microcharity.com.

## Stack
- **Astro 5** — static site generator
- **Tailwind CSS 4** — styling
- **Manrope** + **Fraunces** — fonts (loaded from Google Fonts)
- Deploys as static HTML/CSS/JS to any host (Cloudflare Pages, Netlify, Vercel)

## Brand
- Primary green: `#448515` (with 50–900 scale as `brand-*`)
- Accent red: `#c8201f` (as `accent-*`)
- Headings: Fraunces · Body: Manrope

## Run
```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to ./dist
```

## Structure
```
src/
  layouts/Base.astro          # html shell, header + footer
  components/
    Header.astro              # sticky nav
    Footer.astro              # footer
    CauseCard.astro           # cause tile with progress bar
  pages/
    index.astro               # homepage
  data/site.ts                # nav, focus areas, featured causes
  styles/global.css           # tailwind import + theme tokens
```

## TODO (next pages)
- /who-we-are
- /how-we-work
- /current-causes (list + filters)
- /donations/[slug] (cause detail + donate flow)
- /refer-a-cause (form → Google Apps Script)
- /contact-us
- /legal-financial
- /success-stories
- /terms-conditions, /privacy-policy, /refund-policy
- Annual reports archive
