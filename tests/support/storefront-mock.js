// A stand-in Storefront API for Playwright: intercepts the browser's GraphQL calls to the
// e2e shop and answers them with mock-storefront.js, in the real API's response shapes.
import mock from '../../src/_data/mock.js';
import { createMockClient } from '../../src/scripts/mock-storefront.js';

export const SHOP_DOMAIN = 'e2e-shop.myshopify.com';

function catalogue() {
  const merchandise = {};
  for (const p of mock.products) {
    for (const v of p.variants.nodes) {
      merchandise[v.id] = {
        ...v,
        product: { id: p.id, title: p.title, handle: p.handle, tags: p.tags },
      };
    }
  }
  return merchandise;
}

const asConnection = (cart) => cart && { ...cart, lines: { nodes: cart.lines } };
const payload = (r) => ({ ...r, cart: asConnection(r.cart) });

/**
 * Routes the page's Storefront API calls. Options:
 *   down: true     every call fails with 503 (Shopify unreachable)
 *   sold: [ids]    these variants have sold since the build
 * Returns { calls, sell(id) }: sell() marks a variant sold mid-test, like another buyer.
 */
export async function mockStorefront(page, { down = false, sold = [] } = {}) {
  const data = catalogue();
  for (const id of sold) Object.assign(data[id], { availableForSale: false, quantityAvailable: 0 });
  const mem = new Map();
  const client = createMockClient({
    catalog: async () => data,
    storage: {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    },
  });
  const calls = [];

  await page.route(`https://${SHOP_DOMAIN}/api/**`, async (route) => {
    if (down) return route.fulfill({ status: 503, body: 'Service unavailable' });
    const { query, variables } = route.request().postDataJSON();
    const op = query.match(/(?:query|mutation)\s+(\w+)/)[1];
    calls.push({ op, variables });
    let result;
    switch (op) {
      case 'Availability': {
        const live = await client.availability(variables.handle);
        result = {
          product: live && {
            availableForSale: live.availableForSale,
            variants: { nodes: live.variants },
          },
        };
        break;
      }
      case 'Cart':
        result = { cart: asConnection(await client.cart(variables.id)) };
        break;
      case 'CartCreate':
        result = { cartCreate: payload(await client.cartCreate(variables.input)) };
        break;
      case 'CartLinesAdd':
        result = {
          cartLinesAdd: payload(await client.cartLinesAdd(variables.cartId, variables.lines)),
        };
        break;
      case 'CartLinesUpdate':
        result = {
          cartLinesUpdate: payload(await client.cartLinesUpdate(variables.cartId, variables.lines)),
        };
        break;
      case 'CartLinesRemove':
        result = {
          cartLinesRemove: payload(
            await client.cartLinesRemove(variables.cartId, variables.lineIds),
          ),
        };
        break;
      default:
        return route.fulfill({ status: 400, body: `Unknown operation ${op}` });
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: result }),
    });
  });

  // Shopify's hosted checkout: just a page we can recognise.
  await page.route('https://checkout.example/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Shopify checkout</title><h1>Checkout</h1>',
    }),
  );
  return {
    calls,
    sell: (id) => Object.assign(data[id], { availableForSale: false, quantityAvailable: 0 }),
  };
}
