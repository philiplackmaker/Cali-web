# Launch checklist

Work through this in order. The order matters for the DNS step: today
**www.calicomelton.com is served by GitHub Pages** from this repo's `main` branch (GoDaddy DNS,
`www` CNAME → `philiplackmaker.github.io`, with the bare domain forwarded by GoDaddy). Merging
`shop-foundations` into `main` early would take the current Studio Letter page down, because
`index.html` has moved to `legacy/`.

## 1. Content (Cali)

`npm run check:launch` must pass. It fails while any public page still has placeholder copy or
was built from mock data. Search the templates for `TODO` to find every spot:

| Where                                            | What's needed                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/pages/index.njk`                            | Hero line, and the two "Hello, I'm Cali" paragraphs                                                |
| `src/pages/about.njk`                            | Bio, "How I work", "Exhibitions and shows"                                                         |
| `src/pages/contact.njk`                          | How commissions work: timings, deposit, guide prices                                               |
| `src/pages/info.njk`                             | Shipping times and prices, framing, care, returns (to match Shopify)                               |
| `src/patterns/product-detail/product-detail.njk` | Delivery times on product pages                                                                    |
| `src/_data/shop.js`                              | Intros for All work, Originals and Prints                                                          |
| `src/_data/site.js` → `originalPromises`         | Confirm: signed, certificate of authenticity, insured delivery                                     |
| `src/_data/site.js` → `payments`                 | Leave off unless instalments or Own Art are really set up                                          |
| Shopify: every product                           | Description in Cali's voice, metafields, photos (straight-on first, then detail, then a room view) |
| Shopify: Site photo metaobjects                  | `home-hero`, `about-portrait`, and a few `studio` photos                                           |
| Shopify: Policies                                | Shipping, refund, privacy and terms (linked from /info/)                                           |
| Logo                                             | Check the SVG flower trace, or supply the original vector                                          |

## 2. Shopify (PIP)

Follow **Connect Shopify** in the README: the Headless channel and token, publishing products,
metafield definitions, the Site photo metaobject, and the webhooks. Also:

- [ ] **Checkout domain (recommended).** The site lives on Netlify, so give Shopify its own
      subdomain for checkout. In Shopify → Settings → Domains, connect `shop.calicomelton.com`
      (a GoDaddy CNAME to `shops.myshopify.com`) and make it the primary domain. Checkout then
      shows `shop.calicomelton.com` instead of `….myshopify.com`. Set `SHOPIFY_STORE_DOMAIN` to
      the `.myshopify.com` domain either way.
- [ ] Shipping rates for the UK and abroad, and taxes, in Shopify.
- [ ] Payments: Shopify Payments set up, and a real test order refunded.
- [ ] Check the no-JS "Buy" links on a product page (cart permalinks) reach checkout on the real store.

## 3. Netlify (PIP)

- [ ] Create the site from the GitHub repo. Production branch: `shop-foundations` for now
      (switch to `main` after step 5). Build command and publish folder come from `netlify.toml`.
- [ ] Environment variables: `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_TOKEN`, `NETLIFY_BUILD_HOOK_URL`,
      and `INSTAGRAM_ACCESS_TOKEN` for the latest Instagram posts (README → Instagram; needs @calicomelton
      to be a free Creator account).
- [ ] Build hook created, and pointed at by Shopify's product webhooks.
- [ ] Forms → enable form detection, then set a notification to email Cali for `enquiry`.
- [ ] On the `….netlify.app` address: browse, add to basket, reach checkout, send a test enquiry.
      Deploy previews show `noindex` and a `Disallow: /` robots.txt automatically.
- [ ] CI is green: lint, unit tests, site checks, Playwright (5 browsers, axe), Lighthouse.

## 4. DNS (PIP, at GoDaddy)

Do this when steps 1–3 are done, ideally on a quiet morning. Lower the TTLs a day before if you can.

- [ ] In Netlify → Domain management, add `calicomelton.com` and `www.calicomelton.com`.
- [ ] At GoDaddy: **remove the domain forwarding** on the bare domain, and delete its current A records
      (`15.197.148.33`, `3.33.130.190`, GoDaddy's forwarding servers).
- [ ] Add an `A` record for `@` → `75.2.60.5` (Netlify's load balancer).
- [ ] Change the `www` CNAME from `philiplackmaker.github.io` → `<your-site>.netlify.app`.
- [ ] Wait for Netlify to issue the HTTPS certificate (usually minutes). Then choose which is primary
      (`www` or the bare domain); Netlify redirects the other.
- [ ] Check `https://calicomelton.com` and `https://www.calicomelton.com` both load the new site.

## 5. After the switch

- [ ] **Studio Letter:** sign up on the live site with a real address, and check it arrives in the
      Google Sheet. (The tests only check that the form posts to the Apps Script; they can't see the sheet.)
- [ ] Place a real order, then refund it.
- [ ] In GitHub → Settings → Pages, turn Pages off (or remove the custom domain), so it doesn't
      fight Netlify for the domain. `main` has a `CNAME` file (added on github.com on 8 November)
      that points Pages at calicomelton.com: delete it at the same time.
- [ ] Merge `shop-foundations` into `main`, then switch Netlify's production branch to `main`.
- [ ] Google Search Console: add the domain and submit `https://calicomelton.com/sitemap.xml`.
- [ ] Run Lighthouse against the live product page. Real Shopify images (served as WebP or AVIF by
      Shopify's CDN) should beat the mock images CI measures.
