// Stripe Checkout, server side (used by netlify/functions/checkout.mjs).
// The browser only sends variant ids, quantities and a delivery choice. Prices, names and
// stock come from the site's own built catalogue, so nobody can change a price in the page.
// Talks to Stripe's REST API with fetch: no SDK needed.
import { imageUrl, widthsFor } from '../src/scripts/lib/image.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const MAX_QUANTITY = 20;

// Where "Rest of the world" delivers. Stripe needs an explicit list; add codes as needed
// (two-letter ISO country codes, see Stripe's shipping_address_collection docs).
export const WORLD_COUNTRIES = [
  // Europe
  'AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GG', 'GI', 'GR',
  'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL',
  'PT', 'RO', 'SE', 'SI', 'SK', 'SM',
  // Elsewhere
  'AE', 'AR', 'AU', 'BR', 'CA', 'CL', 'HK', 'IL', 'JP', 'KR', 'MX', 'NZ', 'SG', 'TW', 'US', 'ZA',
]; // prettier-ignore

export class CheckoutError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * The checkout form → { lines: [{ id, quantity }], delivery }.
 * The basket posts pairs of id + quantity. The no-JS buy buttons on a product page post the
 * product form with buy=<variant id>.
 */
export function parseCheckoutForm(form) {
  const ids = form.getAll('id');
  const quantities = form.getAll('quantity');
  const buy = form.get('buy');
  const pairs = buy
    ? [{ id: buy, quantity: Number(quantities[0] ?? 1) }]
    : ids.map((id, i) => ({ id, quantity: Number(quantities[i] ?? 1) }));
  // The same variant twice (two tabs): add them up.
  const merged = new Map();
  for (const { id, quantity } of pairs) {
    if (!id) continue;
    merged.set(id, (merged.get(id) ?? 0) + (Number.isFinite(quantity) ? quantity : 1));
  }
  return {
    lines: [...merged].map(([id, quantity]) => ({ id, quantity })),
    delivery: form.get('delivery'),
  };
}

const lineName = (m) =>
  m.title && m.title !== 'Default Title' ? `${m.product.title}, ${m.title}` : m.product.title;

/** Checks the lines against the catalogue. Returns [{ merchandise, quantity }] or throws. */
export function resolveLines(lines, catalog) {
  if (!lines.length) throw new CheckoutError('Your basket is empty.');
  return lines.map(({ id, quantity }) => {
    const m = catalog[id];
    if (!m) throw new CheckoutError('Something in your basket isn’t in the shop any more.');
    const original = m.product.tags?.includes('original');
    if (m.product.tags?.includes('price-on-request')) {
      throw new CheckoutError(`${m.product.title} is sold by enquiry, so it can’t be bought here.`);
    }
    if (!m.availableForSale) throw new CheckoutError(`Sorry, ${lineName(m)} has sold.`, 409);
    const max = original ? 1 : Math.min(MAX_QUANTITY, m.quantityAvailable ?? MAX_QUANTITY);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > max) {
      throw new CheckoutError(`Please choose between 1 and ${max} of ${lineName(m)}.`);
    }
    return { merchandise: m, quantity };
  });
}

/** The Checkout Session to ask Stripe for, as a plain object (see encodeForm). */
export function sessionParams({ resolved, delivery, origin }) {
  const absolute = (path) => new URL(path, origin).toString();
  const countries = delivery.countries === 'world' ? WORLD_COUNTRIES : delivery.countries;
  const originals = resolved.filter((l) => l.merchandise.product.tags?.includes('original'));
  return {
    mode: 'payment',
    locale: 'en-GB',
    success_url: `${absolute('/order-thanks/')}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: absolute('/cart/'),
    line_items: resolved.map(({ merchandise: m, quantity }) => {
      const image = m.image;
      const width = image && (widthsFor(image).find((w) => w >= 640) ?? widthsFor(image).at(-1));
      return {
        quantity,
        price_data: {
          currency: m.price.currencyCode.toLowerCase(),
          unit_amount: Math.round(Number(m.price.amount) * 100),
          product_data: {
            name: lineName(m),
            ...(image ? { images: [absolute(imageUrl(image.url, width))] } : {}),
            metadata: { variant: m.id },
          },
        },
      };
    }),
    shipping_address_collection: { allowed_countries: countries },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: `${delivery.label} delivery`,
          fixed_amount: { amount: Math.round(delivery.amount * 100), currency: 'gbp' },
        },
      },
    ],
    metadata: { delivery: delivery.id },
    // Lets the next buyer's checkout see that an original has sold (see soldOriginals).
    ...(originals.length
      ? {
          payment_intent_data: {
            metadata: Object.fromEntries(
              originals.map((l) => [`original_${l.merchandise.product.handle}`, 'yes']),
            ),
          },
        }
      : {}),
  };
}

/** Nested object → Stripe's form encoding: a[b][0][c]=d. */
export function encodeForm(value, prefix = '', out = new URLSearchParams()) {
  if (Array.isArray(value)) value.forEach((v, i) => encodeForm(v, `${prefix}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) encodeForm(v, prefix ? `${prefix}[${k}]` : k, out);
  } else if (value !== undefined && value !== null) out.append(prefix, String(value));
  return out;
}

async function stripe(path, { key, fetch: fetchImpl, body, query }) {
  const url = `${STRIPE_API}${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
  const res = await fetchImpl(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body ? encodeForm(body).toString() : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${json.error?.message ?? 'no details'}`);
  return json;
}

/**
 * Originals that have already been paid for, since the last build (the build only knows
 * what the sheet says). Uses Stripe's search; best effort, so a search failure doesn't stop
 * a sale.
 */
export async function soldOriginals(resolved, { key, fetch: fetchImpl }) {
  const handles = resolved
    .filter((l) => l.merchandise.product.tags?.includes('original'))
    .map((l) => l.merchandise.product.handle);
  const sold = [];
  for (const handle of handles) {
    try {
      const result = await stripe('/payment_intents/search', {
        key,
        fetch: fetchImpl,
        query: { query: `status:'succeeded' AND metadata['original_${handle}']:'yes'`, limit: 1 },
      });
      if (result.data?.length) sold.push(handle);
    } catch (error) {
      console.warn(`[checkout] Couldn't check whether ${handle} has sold: ${error.message}`);
    }
  }
  return sold;
}

/** The whole checkout: form in, Stripe Checkout URL out. Throws CheckoutError for the buyer. */
export async function createCheckout({ form, catalog, deliveryOptions, origin, key, fetch }) {
  const { lines, delivery: deliveryId } = parseCheckoutForm(form);
  const resolved = resolveLines(lines, catalog);
  const delivery = deliveryOptions.find((d) => d.id === deliveryId) ?? deliveryOptions[0];
  const sold = await soldOriginals(resolved, { key, fetch });
  if (sold.length) {
    const line = resolved.find((l) => sold.includes(l.merchandise.product.handle));
    throw new CheckoutError(`Sorry, ${lineName(line.merchandise)} has just sold.`, 409);
  }
  const session = await stripe('/checkout/sessions', {
    key,
    fetch,
    body: sessionParams({ resolved, delivery, origin }),
  });
  return session.url;
}
