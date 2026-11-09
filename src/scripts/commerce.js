// One Storefront client and one cart store per page, shared by every component.
//   <html data-commerce="storefront"> + <meta name="shopify-store"> / <meta name="shopify-token">
//     → the real Storefront API (shopify-client.js)
//   <html data-commerce="mock">  → mock-storefront.js (no store yet, the docs, tests)
import { createCartStore } from './cart.js';

function storage() {
  try {
    localStorage.getItem('x');
    return localStorage;
  } catch {
    return undefined; // cart.js falls back to memory
  }
}

const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content;

let clientPromise;

export function getClient() {
  clientPromise ??= (async () => {
    const mode = document.documentElement.dataset.commerce ?? 'mock';
    if (mode === 'storefront') {
      const { createStorefrontClient } = await import('./shopify-client.js');
      return createStorefrontClient({
        domain: meta('shopify-store'),
        token: meta('shopify-token'),
      });
    }
    const { createMockClient } = await import('./mock-storefront.js');
    let catalog;
    return createMockClient({
      catalog: async () => {
        catalog ??= fetch('/assets/data/mock-catalog.json').then((r) => r.json());
        // The docs can mark variants as bought by someone else (see docs-demo.js).
        const sold = JSON.parse(storage()?.getItem('ds-mock-sold') ?? '[]');
        const all = await catalog;
        return Object.fromEntries(
          Object.entries(all).map(([id, v]) => [
            id,
            sold.includes(id) ? { ...v, availableForSale: false, quantityAvailable: 0 } : v,
          ]),
        );
      },
      storage: storage() ?? sessionStorage,
      latency: 400,
      // The docs can switch on "API down" to show error states.
      fail: () => storage()?.getItem('ds-mock-offline') === '1',
    });
  })();
  return clientPromise;
}

let storePromise;

export function getCartStore() {
  storePromise ??= getClient().then((client) => {
    const store = createCartStore({ client, storage: storage() });
    store.load().catch(() => {});
    return store;
  });
  return storePromise;
}

/** Opens the cart drawer if the page has one. Returns false if it doesn't. */
export async function openCart() {
  const drawer =
    document.querySelector('cart-drawer:not([data-inline])') ??
    document.querySelector('cart-drawer');
  if (!drawer) return false;
  await customElements.whenDefined('cart-drawer');
  drawer.open();
  return true;
}
