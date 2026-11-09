# Launch checklist

Work through this in order. The order matters for the DNS step: today
**www.calicomelton.com is served by GitHub Pages** from this repo's `main` branch (GoDaddy DNS,
`www` CNAME → `philiplackmaker.github.io`). The bare domain should point at GitHub Pages too (four
`A` records, `185.199.108–111.153`). Until 9 November it pointed at GoDaddy's parking page. Merging
`shop-foundations` into `main` early would take the current Studio Letter page down, because
`index.html` has moved to `legacy/`.

## 1. Content (Cali)

`npm run check:launch` must pass. It fails while any public page still has placeholder copy. Search the templates for `TODO` to find every spot:

| Where                                            | What's needed                                                  |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `src/pages/index.njk`                            | Hero line, and the two "Hello, I'm Cali" paragraphs            |
| `src/pages/about.njk`                            | Bio, "How I work", "Exhibitions and shows"                     |
| `src/pages/contact.njk`                          | How commissions work: timings, deposit, guide prices           |
| `src/pages/info.njk`                             | Packing and posting, framing, care, returns, privacy           |
| `src/patterns/product-detail/product-detail.njk` | Delivery times on product pages                                |
| `scripts/shop.js`                                | Intros for All work, Originals and Prints                      |
| `src/_data/site.js` → `delivery`                 | Real delivery prices and times, UK and rest of the world       |
| `src/_data/site.js` → `originalPromises`         | Confirm: signed, certificate of authenticity, insured delivery |
| `src/_data/site.js` → `payments`                 | Leave off unless instalments or Own Art are really set up      |
| /admin/ → Prints and paintings                   | Check each piece: photo descriptions, sizes, prices            |
| /admin/ → Site photos                            | The photo of Cali, and a few studio photos                     |
| Logo                                             | Check the SVG flower trace, or supply the original vector      |

## 2. Stripe (PIP)

Follow **Connect Stripe** in the README. Also:

- [ ] Stripe account verified for payouts; receipts and order notifications switched on.
- [ ] A full test order with the **test** key: basket → Checkout → Stripe → `/order-thanks/`,
      and the basket is empty afterwards. Try both delivery options.
- [ ] The no-JS "Buy" buttons on a product page reach Stripe.
- [ ] Swap `STRIPE_SECRET_KEY` to the **live** key, redeploy, place one real order, refund it.

## 3. Netlify (PIP)

- [ ] Create the site from the GitHub repo. Production branch: `shop-foundations` for now
      (switch to `main` after step 5). Build command and publish folder come from `netlify.toml`.
- [ ] Environment variables: `STRIPE_SECRET_KEY`, `NETLIFY_BUILD_HOOK_URL`, `CLOUDFLARE_ANALYTICS_TOKEN`
      (README → Monitoring), and `INSTAGRAM_ACCESS_TOKEN` for the latest Instagram posts (README → Instagram; needs @calicomelton
      to be a free Creator account).
- [ ] Build hook created (used by the nightly rebuild).
- [ ] **The admin:** enable Identity (invite only) and Git Gateway, invite Cali (README → The admin).
      She signs in at `/admin/`, changes a price, publishes, and sees it live a few minutes later.
- [ ] Notifications → email on **Deploy failed**.
- [ ] Forms → enable form detection, then set a notification to email Cali for `enquiry`.
- [ ] On the `….netlify.app` address: browse, add to basket, reach checkout, send a test enquiry.
      Deploy previews show `noindex` and a `Disallow: /` robots.txt automatically.
- [ ] CI is green: lint, unit tests, site checks, Playwright (5 browsers, axe), Lighthouse.

## 4. DNS (PIP, at GoDaddy)

Do this when steps 1–3 are done, ideally on a quiet morning. Lower the TTLs a day before if you can.

- [ ] In Netlify → Domain management, add `calicomelton.com` and `www.calicomelton.com`.
- [ ] At GoDaddy: make sure parking and forwarding are off for the domain, and delete the bare domain's
      current `A` records: GitHub Pages' `185.199.108.153` to `185.199.111.153` (or, if the interim fix
      was never made, GoDaddy's parking servers `15.197.148.33` and `3.33.130.190`).
- [ ] Add an `A` record for `@` → `75.2.60.5` (Netlify's load balancer).
- [ ] Change the `www` CNAME from `philiplackmaker.github.io` → `<your-site>.netlify.app`.
- [ ] Wait for Netlify to issue the HTTPS certificate (usually minutes). Then choose which is primary
      (`www` or the bare domain); Netlify redirects the other.
- [ ] Check `https://calicomelton.com` and `https://www.calicomelton.com` both load the new site.

## 5. After the switch

- [ ] **Studio Letter:** sign up on the live site with a real address, and check it arrives in the
      Google Sheet. (The tests only check that the form posts to the Apps Script; they can't see the sheet.)
- [ ] In GitHub → Settings → Pages, turn Pages off (or remove the custom domain), so it doesn't
      fight Netlify for the domain. `main` has a `CNAME` file (added on github.com on 8 November)
      that points Pages at calicomelton.com: delete it at the same time.
- [ ] Merge `shop-foundations` into `main`, then switch Netlify's production branch to `main`,
      and change `branch:` in `src/admin/config.yml` to `main` (or the admin keeps saving to the old branch).
- [ ] **Monitoring:** set the repository variable `MONITOR_URL` to `https://calicomelton.com`, run the
      "Monitor the live shop" workflow once by hand, and check it's green (README → Monitoring).
- [ ] Google Search Console: add the domain and submit `https://calicomelton.com/sitemap.xml`.
- [ ] Run Lighthouse against the live product page.
