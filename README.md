# Calico Melton: shop

Cali's online shop for original paintings and prints. It's plain HTML, CSS and vanilla JS, built with [Eleventy](https://www.11ty.dev/). Shopify runs products, stock and checkout through the Storefront API. Netlify hosts it.

The site is built as a **design system first**: tokens, then components, then patterns, then pages. Pages only use documented parts, so adding a page should never need new CSS. You can browse the system at `/design-system/`, which isn't linked from the public site and is set to `noindex`.

## Run it

You need Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev        # builds tokens, serves at http://localhost:8080 with live reload
```

| Command                | What it does                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Build tokens and serve locally                                                                                              |
| `npm run build`        | Build tokens, check token contrast, build the site into `_site/`                                                            |
| `npm run tokens`       | Compile `/tokens/*.json` → `src/styles/tokens.css` and docs data                                                            |
| `npm run contrast`     | Fail if any allowed colour pairing misses WCAG AA                                                                           |
| `npm run lint`         | Stylelint, ESLint, Prettier check                                                                                           |
| `npm run format`       | Prettier, writing changes                                                                                                   |
| `npm test`             | Unit tests (`node:test`)                                                                                                    |
| `npm run test:e2e`     | Playwright: shop flows, edge cases, forms, axe on every page, keyboard only, in 5 browsers, against a mocked Storefront API |
| `npm run check:site`   | Titles, descriptions, canonicals, image sizes, JSON-LD, sitemap, JS budget                                                  |
| `npm run check:launch` | The same, plus no placeholder copy or mock data: the go-live gate                                                           |
| `npm run lighthouse`   | Lighthouse CI on mobile: 95+ in every category, LCP ≤ 2.5s, CLS < 0.1                                                       |
| `npm run quality`      | All of the above, in order                                                                                                  |

CI (`.github/workflows/ci.yml`) runs the whole quality bar on every push to `main` and every pull request, in three jobs: checks, Playwright, and Lighthouse. Going live is covered step by step in [LAUNCH.md](LAUNCH.md).

The e2e tests build the site in live (`storefront`) mode against a fake store (`tests/support/fake-storefront.mjs`), then answer the browser's Storefront API calls with `tests/support/storefront-mock.js`. No real Shopify store is needed.

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

Product and collection pages are generated from `src/_data/shop.js`. It returns mock data for now and will fetch from Shopify in step 4, in the same shape.

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

- `src/scripts/cart.js` is the cart store. It wraps a client with the Storefront API's cart methods, keeps the cart id in `localStorage`, runs one operation at a time, and emits `change` events with messages in Cali's voice.
- `src/scripts/commerce.js` creates one client and one store per page. On a live build the page says `<html data-commerce="storefront">`, and the client is `src/scripts/shopify-client.js`, talking to the real Storefront API. Without Shopify settings, and always on the `/design-system/` pages, it's `mock-storefront.js`.
- `<add-to-cart>`, `<cart-drawer>` and `<cart-count>` all share that store. Checkout is Shopify's hosted `checkoutUrl`.
- `<product-live>` checks live stock and price when a product page opens, because pages are built ahead of time. A painting that sold since the last build shows as sold. If Shopify can't be reached, buying pauses with a message.
- Without JS, product pages show "Buy" links: Shopify cart permalinks that go straight to checkout.

## Connect Shopify (one-time setup)

1. **Storefront API token.** In the Shopify admin, add the **Headless** sales channel and create a storefront. Copy its **public** access token. Give it these Storefront API permissions:
   - read products, variants and collections (`unauthenticated_read_product_listings`)
   - read product inventory (`unauthenticated_read_product_inventory`), for "only 1 left" and sold-out checks
   - read and write carts (`unauthenticated_read_checkouts`, `unauthenticated_write_checkouts`)
   - read metaobjects (`unauthenticated_read_metaobjects`), for the site photos
2. **Publish products** to the Headless channel. The site can only see products published there.
3. **Metafield definitions** (Settings → Custom data → Products), all in the `custom` namespace with **Storefront access** turned on:

   | Name         | Key                   | Type             | For              |
   | ------------ | --------------------- | ---------------- | ---------------- |
   | Medium       | `custom.medium`       | Single line text | "Oil on canvas"  |
   | Dimensions   | `custom.dimensions`   | Single line text | "60 × 80 cm"     |
   | Year         | `custom.year`         | Integer          | 2026             |
   | Framing      | `custom.framing`      | Single line text | "Oak tray frame" |
   | Edition size | `custom.edition_size` | Integer          | 50 (prints)      |

4. **Environment variables.** Locally, copy `.env.example` to `.env`. On Netlify, set them under Site configuration → Environment variables:
   - `SHOPIFY_STORE_DOMAIN` (e.g. `calicomelton.myshopify.com`) and `SHOPIFY_STOREFRONT_TOKEN`. With both set, the build fetches live data, and the log says `[shop] Fetched N products`. Without them it uses the mock catalogue and says so. `SHOPIFY_MOCK=1` forces the mock.
   - `NETLIFY_BUILD_HOOK_URL`: see the next step.
   - `INSTAGRAM_ACCESS_TOKEN` (optional): for the latest Instagram posts. See "Instagram" below.
5. **Rebuilds.**
   - In Netlify, create a build hook (Site configuration → Build & deploy → Build hooks) and copy its URL.
   - In Shopify (Settings → Notifications → Webhooks), add three webhooks, **Product creation**, **Product update** and **Product deletion**, all in JSON format, all pointing at that URL. New work and price changes go live within a few minutes.
   - Set the same URL as `NETLIFY_BUILD_HOOK_URL`. The scheduled function `netlify/functions/nightly-rebuild.mjs` rebuilds every night at 04:00 UTC. That picks up site photo changes, because Shopify's admin can't send webhooks for metaobjects. To see a photo change straight away, use Netlify's **Trigger deploy** button.

The Storefront token is public by design. It's in every page's HTML, like the Buy Button's, and only allows reading the catalogue and managing carts.

## Add a product in Shopify

- **Original:** one product, inventory **1**, tag `original`. Fill in the metafields for medium, dimensions (cm), year and **framing** (e.g. "Oak tray frame, ready to hang"). Add it to the **Originals** collection.
- **Price on request:** also tag a major piece `price-on-request`. Its price is hidden, and the page offers "Enquire about this painting" instead of the basket. Keep a real price in Shopify anyway, for your own records.
- **Print:** one product with variants for **size** and **paper**, tag `print`, and an edition-size metafield. Add it to the **Prints** collection.
- Upload the photos to the product in Shopify. The first image is the main one, so make it the painting straight on. Next, add a detail shot and a photo of the painting on a wall in a room, so collectors can judge its scale.
- Publish it to the **Headless** sales channel. Saving it triggers a rebuild through the product webhooks, and it's live within a few minutes.

**Enquiries** from /contact/ arrive as Netlify Forms submissions (form name `enquiry`). In Netlify, go to Site configuration → Forms → Notifications and set them to email Cali.

## Add or change site photos (hero, About, studio)

Photos that aren't products, like the home hero, the About portrait and the studio shots, are kept in Shopify too, as **metaobjects**. Shopify stays the only place Cali edits content. Until there are entries, the hero falls back to the newest painting and the other spots use placeholders.

**One-time setup (Shopify admin → Settings → Custom data → Metaobjects):** add a definition called **Site photo**, type `site_photo`, with these fields:

| Field                   | Type                                                               | Notes                                             |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| Placement (`placement`) | Single line text, choices: `home-hero`, `about-portrait`, `studio` | Where on the site the photo goes                  |
| Image (`image`)         | File (images only)                                                 | Upload the largest version you have               |
| Alt text (`alt_text`)   | Single line text, required                                         | Describe the painting or scene for screen readers |
| Caption (`caption`)     | Single line text, optional                                         | Shown under studio photos                         |
| Order (`order`)         | Integer, optional                                                  | Lower numbers first, for the studio photos        |

Turn on **Storefront access** for the definition. Otherwise the site can't read it.

**Day to day (Content → Metaobjects → Site photo):**

- To change the hero, edit the `home-hero` entry and swap the image. Only one entry should use `home-hero`, and the same goes for `about-portrait`.
- To add a studio photo, add an entry with placement `studio`, then set its order.
- Changes go live on the nightly rebuild, or straight away with Netlify's **Trigger deploy** button.

Shopify's CDN serves every photo, and the site requests the size each screen needs.

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
