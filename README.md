# Calico Melton: shop

Cali's online shop for original paintings and prints. It's plain HTML, CSS and vanilla JS, built with [Eleventy](https://www.11ty.dev/). Cali edits products and photos in a simple admin at **/admin/** (Decap CMS), payments go through **Stripe Checkout**, and Netlify hosts it.

The site is built as a **design system first**: tokens, then components, then patterns, then pages. Pages only use documented parts, so adding a page should never need new CSS. You can browse the system at `/design-system/`, which isn't linked from the public site and is set to `noindex`.

## Run it

You need Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev        # builds tokens, serves at http://localhost:8080 with live reload
```

| Command                | What it does                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Build tokens and serve locally                                                                                               |
| `npm run build`        | Build tokens, check token contrast, build the site into `_site/`                                                             |
| `npm run tokens`       | Compile `/tokens/*.json` → `src/styles/tokens.css` and docs data                                                             |
| `npm run contrast`     | Fail if any allowed colour pairing misses WCAG AA                                                                            |
| `npm run lint`         | Stylelint, ESLint, Prettier check                                                                                            |
| `npm run format`       | Prettier, writing changes                                                                                                    |
| `npm test`             | Unit tests (`node:test`)                                                                                                     |
| `npm run test:e2e`     | Playwright: shop flows, edge cases, forms, axe on every page, keyboard only, in 5 browsers, against a mocked Stripe checkout |
| `npm run check:site`   | Titles, descriptions, canonicals, image sizes, JSON-LD, sitemap, JS budget                                                   |
| `npm run check:launch` | The same, plus no placeholder copy or mock data: the go-live gate                                                            |
| `npm run lighthouse`   | Lighthouse CI on mobile: 95+ in every category, LCP ≤ 2.5s, CLS < 0.1                                                        |
| `npm run quality`      | All of the above, in order                                                                                                   |

CI (`.github/workflows/ci.yml`) runs the whole quality bar on every push to `main` and every pull request, in three jobs: checks, Playwright, and Lighthouse. Going live is covered step by step in [LAUNCH.md](LAUNCH.md).

The e2e tests build the site with the test products in `src/_data/mock.js` (`SHOP_FIXTURE=mock`, which has originals, sold work and sales), fake the Instagram API at build time (`tests/support/fake-apis.mjs`), and stand in for the checkout function and Stripe in the browser (`tests/support/shop-mock.js`). No Stripe account is needed.

## How the code is laid out

```
/tokens               DTCG JSON: primitive/, semantic/, component/
/scripts              build-tokens.js, check-contrast.js, contrast-pairs.js
/src
  /styles             reset.css, fonts.css, base.css, utilities.css, tokens.css (generated)
  /components         one folder per component (.njk, .css, .js, README.md)
  /patterns           one folder per pattern
  /pages              page templates
  /_layouts           base.njk, docs.njk
  /_data              site.js, contrast.js, designTokens.json (generated)
  /scripts            browser JS (served at /assets/js/)
  /design-system      the /design-system/ docs pages
  /assets             images, favicons, CSS bundles
/tests                unit (and later Playwright) tests
/legacy               the old one-page Studio Letter site, for reference
```

All CSS ships as one file, `/assets/css/site.css`, in cascade layers:

```css
@layer reset, tokens, base, components, patterns, utilities;
```

Any `.css` file in `src/components/` or `src/patterns/` is bundled into its layer automatically.

## Add a token

1. Pick a tier:
   - **Primitive** (`tokens/primitive/`) is a raw value, like `color.maroon.600`.
   - **Semantic** (`tokens/semantic/`) says what a value is for, like `color.text.muted`. It points at a primitive: `"$value": "{color.maroon.600}"`.
   - **Component** (`tokens/component/`) is a knob for one component, like `button.radius`. Only add one when a component really needs it.
2. Add it in [DTCG](https://design-tokens.github.io/community-group/format/) format with `$value`, plus a `$description` if its purpose isn't obvious. Write values ready for CSS, such as `1rem`, `clamp(…)` or `#6E2A2E`.
3. Run `npm run tokens`. The token becomes `--ds-<path-with-dashes>`, for example `--ds-color-text-muted`, and it appears on `/design-system/tokens/`.
4. If it's a colour used for text or controls, add each foreground/background pairing it will be used in to `scripts/contrast-pairs.js`. The build fails if a pairing is below WCAG AA.

Components should use semantic or component tokens, never primitives.

**The rule Stylelint enforces:** outside `/tokens`, CSS can't contain raw colours, `px`, `rem`, `em`, `ch`, `vw`, `ms` or `s`, or raw font, radius, shadow or z-index values. Use `var(--ds-…)`. The exceptions:

- `src/styles/fonts.css` can name font families, because `@font-face` can't use variables.
- Media and container queries can use `rem` breakpoints, because CSS can't read variables there. Use the values listed under Breakpoints in the tokens.

## Add a component

Each component lives in its own folder:

```
src/components/<name>/
  <name>.njk     Nunjucks macro(s): {% from "components/<name>/<name>.njk" import <name> %}
  <name>.css     styles, bundled into @layer components automatically
  <name>.js      optional custom element (light DOM), copied to /assets/js/components/<name>/
  README.md      what it's for, its options, states and accessibility notes
```

The checklist:

1. **Markup first.** Write the macro so the HTML reads and works without JS. Use BEM classes with a `ds-` prefix: `ds-name`, `ds-name__part`, `ds-name--variant`.
2. **Tokens only.** Use semantic or component tokens. If you need a new value, add a token first (see above). Stylelint will catch anything raw.
3. **JS, if needed.** Make it a custom element that enhances the markup inside it. Register its tag in `src/scripts/main.js`, which loads it only on pages that use it. Keep logic you could test in `src/scripts/lib/` and unit-test it.
4. **Accessibility.** It should work with the keyboard alone, have a visible focus ring (the base styles give one), labels and names, `aria-live` for changes that happen out of sight, and no motion with `prefers-reduced-motion`.
5. **Copy** in Cali's voice: warm, first person, plain.
6. **Docs.** Add `src/design-system/components/<name>.njk` showing every variant and state with the `example()` helper from `src/_includes/docs.njk`, plus a README.
7. **Check.** Run `npm run lint`, `npm test`, `npm run build` and `npm run test:e2e`. The e2e axe test covers new pages automatically, via the sitemap.

## Add a pattern or a page

**Patterns** live in `src/patterns/<name>/` and work like components (a `.njk` macro, `.css`, optional `.js`, and a `README.md`), but they're built _from_ components. Their CSS goes in `@layer patterns`. Document each one in `src/design-system/patterns/<name>.njk`.

**Pages** live in `src/pages/` and only stack patterns inside `section()` calls. Long copy goes inside `prose()`. A page has no CSS of its own. If a page needs something new, make it a pattern first. Front matter sets `title` and `description` (both must be unique), plus:

- `preloadImage` / `preloadSizes`: the page's LCP painting. Set it in a `.11tydata.js` file.
- `jsonLd`: structured data. See `src/scripts/lib/structured-data.js`.
- `footerSignup: false`: on pages that already have a Studio Letter band.
- `noindex: true` and `eleventyExcludeFromSitemap: true`: for utility pages like /cart/.

Product and collection pages are generated from the `shop` data (`scripts/shop.js`), read from `content/`.

| Page                    | URL                                           | Template                              |
| ----------------------- | --------------------------------------------- | ------------------------------------- |
| Home                    | `/`                                           | `index.njk`                           |
| Shop                    | `/shop/`, `/shop/originals/`, `/shop/prints/` | `collection.njk` (one per collection) |
| Product                 | `/shop/{handle}/`                             | `product.njk` (one per product)       |
| Basket                  | `/cart/`                                      | `cart.njk`                            |
| About                   | `/about/`                                     | `about.njk`                           |
| The Studio Letter       | `/studio-letter/`                             | `studio-letter.njk`                   |
| Commissions and contact | `/contact/`, `/contact/thanks/`               | `contact.njk`, `contact-thanks.njk`   |
| Shipping and FAQ        | `/info/`                                      | `info.njk`                            |
| Not found               | `/404.html`                                   | `404.njk`                             |
| Sitemap, robots         | `/sitemap.xml`, `/robots.txt`                 | `sitemap.njk`, `robots.njk`           |

Placeholder copy is marked `<!-- TODO copy -->` or `TODO` in the templates. Search for "TODO" to find every spot.

### How the cart fits together

- `scripts/shop.js` loads the catalogue at build time from `content/` (`scripts/content.js`): one JSON file per product in `content/products/`, site photos in `content/photos.json`, uploaded photos in `content/uploads/`, all edited at /admin/. Every photo is resized to WebP (320 to 1440 px) during the build. Products keep the shape the site was first built around (Shopify's Storefront API), so templates don't care where they came from. The build writes every variant to `/assets/data/catalog.json`.
- `src/scripts/cart.js` is the cart store, over `src/scripts/local-cart.js`: the basket lives in the browser's `localStorage`, with prices and stock from `catalog.json`. It runs one operation at a time and emits `change` events with messages in Cali's voice. `src/scripts/commerce.js` creates one of each per page; the `/design-system/` pages use the docs' example products instead (`data-commerce="mock"`).
- `<add-to-cart>`, `<cart-drawer>` and `<cart-count>` all share that store.
- **Checkout** is a form in the basket. It posts the lines (variant id + quantity) and the delivery choice (UK or rest of the world, from `site.delivery`) to `/api/checkout`: `netlify/functions/checkout.mjs`, with the logic in `scripts/checkout.js`. That checks every line against `catalog.json` (so a price can't be changed in the page), creates a Stripe Checkout Session with the prices, delivery and allowed countries, and redirects to Stripe. After paying, Stripe sends the buyer to `/order-thanks/`, which empties the basket.
- **Originals** can only be bought once: the checkout function asks Stripe whether that painting has already been paid for, even if the sheet doesn't say Sold yet.
- Without JS, product pages show "Buy" buttons that post straight to `/api/checkout`.

## The admin (Decap CMS)

Cali goes to **calicomelton.com/admin/**, signs in with her email and password, and edits:

- **Prints and paintings:** title, print or original, photos (with a description of each for blind visitors), sizes and prices, sold, price on request, description, medium, year, framing. "Show it in the shop" hides a piece without deleting it.
- **Site photos:** the home page painting, the photo of Cali, and studio photos.

Pressing **Publish** saves the change to the repo (`content/`), and Netlify rebuilds the site: it's live in a few minutes. The config is `src/admin/config.yml`.

**One-time setup (PIP, after the Netlify site exists):**

1. Netlify → the site → **Identity** → Enable Identity.
2. Identity → Settings → **Registration: Invite only**. (Otherwise anyone could sign up.)
3. Identity → Services → **Enable Git Gateway**. This lets the admin save to GitHub without Cali needing a GitHub account.
4. Identity → **Invite users** → Cali's email (and yours). The invite email links to the site; the home page passes it on to /admin/, where she sets her password.
5. Optional: Identity → Emails, to make the invite and password-reset emails sound like Cali.

The admin saves to the branch in `src/admin/config.yml` (`shop-foundations` until launch; change it to `main` when that's merged, see LAUNCH.md).

**Trying the admin locally:** run `npx decap-server` in one terminal and `npm run dev` in another, then open http://localhost:8080/admin/ and press Login (no account needed). Changes are written straight to `content/`.

**Photos:** upload the best version you have; a JPEG around 2,400 pixels wide and under 10 MB is ideal. The build makes the small web copies.

## Connect Stripe (one-time setup)

1. Create a Stripe account for Cali (UK, GBP) and finish the business details so payouts can start.
2. Developers → API keys: copy the **secret** key. Set it as `STRIPE_SECRET_KEY` on Netlify. Use the **test** key (`sk_test_…`) first; test card `4242 4242 4242 4242`, any future date and CVC.
3. Settings → Payment methods: card is on by default. Turn on Apple Pay and Google Pay (and Klarna if wanted, then set `site.payments.instalments`).
4. Settings → Customer emails: turn on **Successful payments** so buyers get a receipt. Settings → Business → Public details: the name buyers see on the payment page and their statement.
5. Orders: each paid checkout shows under Payments, with the shipping address and the items. Turn on email notifications for successful payments (your profile → Communication preferences) so Cali hears about each order. Refunds are done from the payment.
6. Delivery prices and countries are in `src/_data/site.js` → `delivery` (and the "Rest of the world" country list in `scripts/checkout.js`).

The secret key only ever lives on Netlify, inside the checkout function. Pages never see it.

## Add a print or an original

In the admin, **Prints and paintings → New print or painting**:

- **Print:** type Print, one row in "Sizes and prices" per size.
- **Original:** type Original, one row with the painting's size and price. It sells once. When it has sold, switch on **Sold** (checkout already stops a second sale, but this marks it sold on the site).
- **Price on request:** switch it on; the page offers "Enquire about this painting" instead of the basket.
- Then **Publish**. It's live in a few minutes.

**Enquiries** from /contact/ arrive as Netlify Forms submissions (form name `enquiry`). In Netlify, go to Site configuration → Forms → Notifications and set them to email Cali.

## Netlify credits (free plan)

Netlify's free plan gives 300 credits a month, and **pauses the site if they run out**. What uses them:

| What                        | Credits                   | How this site keeps it low                                                                                               |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A production deploy         | 15 (failed ones are free) | Only `main` is production. Development is pushed to `shop-foundations`, a branch deploy (free).                          |
| Publishing in /admin/       | 15 per Publish            | Each Publish is a commit to `main`. Cali makes all her changes, then publishes; about 10 publishes a month is plenty.    |
| The daily Instagram check   | 0, or 15 for a new post   | `nightly-rebuild.mjs` compares Instagram's latest posts with `/assets/data/instagram-posts.json` and only then rebuilds. |
| Traffic                     | about 20 per GB           | Pages and images are small (WebP, lazy loading, clips under 0.5 MB). About 5,000 visits a month fit.                     |
| Form submissions, functions | small                     | Enquiries, checkout and `/api/health`.                                                                                   |

Turn on usage notifications (Team settings → Billing). If the shop gets busy, Netlify's Personal plan has 1,000 credits a month.

## Monitoring

| What                        | How                                                                                                                                                                                                                                                                         | Setup                                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Site up, checkout works** | `.github/workflows/monitor.yml` runs `scripts/monitor.js` every 30 minutes: home, shop and a product page load, and `/api/health` (`netlify/functions/health.mjs`) confirms the catalogue loads and Stripe accepts the key. A failure fails the run, and GitHub emails you. | Set the repository variable `MONITOR_URL` to `https://calicomelton.com`. GitHub → Settings → Notifications → Actions: notify for failed workflows. Runs from `main` only. |
| **Orders**                  | Stripe emails each successful payment.                                                                                                                                                                                                                                      | Stripe → your profile → Communication preferences → Successful payments. Add Cali's email too.                                                                            |
| **Builds**                  | Netlify emails if a deploy fails (for example a broken file from the admin).                                                                                                                                                                                                | Netlify → Site configuration → Notifications → Emails → Deploy failed.                                                                                                    |
| **Visitors**                | Cloudflare Web Analytics: page views, top pages, where visitors come from. No cookies, so no consent banner.                                                                                                                                                                | Cloudflare → Analytics & Logs → Web Analytics → Add a site (calicomelton.com), copy the token, set `CLOUDFLARE_ANALYTICS_TOKEN` on Netlify. Production only.              |

Check by hand any time: `node scripts/monitor.js https://calicomelton.com`, or open `/api/health`.

## Instagram: the latest three posts

The Instagram band on the home and About pages shows Cali's three newest posts, each linking to its post on Instagram. At build time `scripts/instagram.js` fetches them with the Instagram API, then downloads and resizes the images (WebP, 320px and 640px) onto this site. Visitors never load anything from Instagram: there's no embed, third-party script or tracking. The nightly rebuild keeps them current. Without a token, or if Instagram can't be reached, the band shows the studio photos instead, and the build log says why.

**One-time setup:**

1. **Make @calicomelton a professional account.** In the Instagram app: Settings → Account type and tools → Switch to professional account → **Creator**. It's free and doesn't change how the profile looks.
2. **Create a Meta app.** At [developers.facebook.com](https://developers.facebook.com/), create an app, add the **Instagram** product, and choose **API setup with Instagram login**.
3. **Generate a token.** Add @calicomelton to the app and generate an access token. This is a long-lived token, valid for 60 days.
4. **Save it** as `INSTAGRAM_ACCESS_TOKEN` in `.env` locally and in Netlify's environment variables.

**Keeping it alive:** `netlify/functions/nightly-rebuild.mjs` refreshes the token every night, so it shouldn't expire. If Instagram ever issues a different token string, the function's log says so. If the posts disappear, generate a new token (step 3) and update the variable.

## The Studio Letter

Signups still go to the Google Apps Script web app that writes them into the Google Sheet. The endpoint is in `src/components/email-signup/email-signup.njk`. The old one-page site is kept in `legacy/studio-letter.html` for reference. Its replacement is `/studio-letter/`.
