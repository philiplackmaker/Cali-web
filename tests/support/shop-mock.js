// The shop's moving parts for Playwright: the catalogue the basket reads
// (/assets/data/catalog.json), the checkout function (/api/checkout) and Stripe's page.
// The e2e build uses the test products in src/_data/mock.js (SHOP_FIXTURE=mock).
import mock from '../../src/_data/mock.js';
import { variantIndex } from '../../src/scripts/lib/catalog.js';

/**
 * Options:
 *   down: true     the catalogue can't be loaded (buying pauses)
 *   sold: [ids]    these variants have sold since the build
 * Returns { checkouts, sell(id) }: checkouts are the posted checkout forms (URLSearchParams);
 * sell() marks a variant sold mid-test, like another buyer.
 */
export async function mockShop(page, { down = false, sold = [] } = {}) {
  const data = variantIndex(mock.products);
  const sell = (id) => Object.assign(data[id], { availableForSale: false, quantityAvailable: 0 });
  sold.forEach(sell);
  const checkouts = [];

  await page.route('**/assets/data/catalog.json', (route) =>
    down
      ? route.fulfill({ status: 503, body: 'Service unavailable' })
      : route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) }),
  );
  // netlify/functions/checkout.mjs creates a Stripe session and redirects there. Playwright
  // can't fake a redirect, so this answers with a stand-in for Stripe's page directly.
  await page.route('**/api/checkout', (route) => {
    checkouts.push(new URLSearchParams(route.request().postData() ?? ''));
    return route.fulfill({
      contentType: 'text/html',
      body: '<title>Stripe checkout</title><h1>Pay</h1>',
    });
  });
  return { checkouts, sell };
}
