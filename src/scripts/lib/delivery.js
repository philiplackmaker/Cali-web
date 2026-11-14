// Postage for a basket, shared by the basket (browser) and the checkout (server), so the
// price shown is the price charged.
//
//   - Each original can have its own postage (set in the admin), and be UK only.
//   - Prints use the delivery option's price (Settings → Delivery: UK or rest of the world).
//   - Everything goes in one parcel, so the basket pays the single HIGHEST postage.
//   - A basket with anything UK-only can only be delivered to the UK.

/** The shipping info a basket line's product carries: { postage: number|null, ukOnly: bool }. */
const shippingOf = (line) => line?.product?.shipping ?? line?.merchandise?.product?.shipping ?? {};

/** True if anything in the basket can only be posted within the UK. */
export function ukOnly(products) {
  return products.some((p) => Boolean(shippingOf({ product: p }).ukOnly));
}

/** The delivery options this basket can use (drops "rest of the world" if anything is UK only). */
export function availableOptions(options, products) {
  return ukOnly(products) ? options.filter((o) => o.id === 'uk') : options;
}

/**
 * Postage in pounds for a basket and a delivery option: the highest of each item's own
 * postage, and the option's price for any item without one.
 */
export function postageFor(option, products) {
  const amounts = products.map((p) => {
    const own = shippingOf({ product: p }).postage;
    return typeof own === 'number' && own >= 0 ? own : option.amount;
  });
  return amounts.length ? Math.max(...amounts) : option.amount;
}
