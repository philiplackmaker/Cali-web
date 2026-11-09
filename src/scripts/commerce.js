// One basket client and one cart store per page, shared by every component.
//   <html data-commerce="stripe"> → the shop's catalogue (/assets/data/catalog.json), and the
//     checkout form posts to /api/checkout, which sends the buyer to Stripe.
//   <html data-commerce="mock">   → the docs' example products, a pretend checkout, and
//     switches for "sold" and "offline" states (see docs-demo.js).
import { createCartStore } from './cart.js';
import { createLocalCart } from './local-cart.js';

function storage() {
  try {
    localStorage.getItem('x');
    return localStorage;
  } catch {
    return undefined; // cart.js falls back to memory
  }
}

let clientPromise;

export function getClient() {
  clientPromise ??= (async () => {
    const mock = document.documentElement.dataset.commerce === 'mock';
    let catalog;
    return createLocalCart({
      catalog: async () => {
        catalog ??= fetch(mock ? '/assets/data/mock-catalog.json' : '/assets/data/catalog.json')
          .then((r) => {
            if (!r.ok) throw new Error(`Catalogue ${r.status}`);
            return r.json();
          })
          .catch((error) => {
            catalog = null; // try again next time
            throw error;
          });
        const all = await catalog;
        if (!mock) return all;
        // The docs can mark variants as bought by someone else (see docs-demo.js).
        const sold = JSON.parse(storage()?.getItem('ds-mock-sold') ?? '[]');
        return Object.fromEntries(
          Object.entries(all).map(([id, v]) => [
            id,
            sold.includes(id) ? { ...v, availableForSale: false, quantityAvailable: 0 } : v,
          ]),
        );
      },
      storage: storage() ?? sessionStorage,
      ...(mock
        ? {
            key: 'ds-mock-carts',
            checkoutUrl: 'https://checkout.example/mock',
            latency: 400,
            // The docs can switch on "offline" to show error states.
            fail: () => storage()?.getItem('ds-mock-offline') === '1',
          }
        : {}),
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
