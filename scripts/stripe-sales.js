// Originals sold through the shop are marked Sold automatically: checkout tags each paid
// original in Stripe (payment metadata original_<handle>: yes, see scripts/checkout.js), and
// every build asks Stripe for those payments. Cali can still tick Sold in the admin for work
// sold elsewhere. A fully refunded order puts the piece back on sale.
//
// The Stripe webhook (netlify/functions/stripe-webhook.mjs) starts a rebuild after each sale or
// refund, so the shop catches up within a couple of minutes.
import { createHmac, timingSafeEqual } from 'node:crypto';

const STRIPE_API = 'https://api.stripe.com/v1';
// The shop went live on 14 November 2026: nothing before then can be a sale.
const SINCE = Math.floor(Date.UTC(2026, 10, 14) / 1000);

async function get(path, query, { key, fetch: fetchImpl }) {
  const res = await fetchImpl(`${STRIPE_API}${path}?${new URLSearchParams(query)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`Stripe ${res.status}: ${json.error?.message ?? 'no details'}`);
    error.status = res.status;
    throw error;
  }
  return json;
}

/** The original handles a payment paid for (from checkout's metadata). */
export function originalsIn(paymentIntent) {
  return Object.entries(paymentIntent.metadata ?? {})
    .filter(([k, v]) => k.startsWith('original_') && v === 'yes')
    .map(([k]) => k.slice('original_'.length));
}

/** Paid, and not refunded in full (when Stripe tells us; a restricted key may not). */
export function stillPaid(paymentIntent) {
  return paymentIntent.status === 'succeeded' && paymentIntent.latest_charge?.refunded !== true;
}

/**
 * Handles of originals paid for through the shop. Pages through every payment since launch.
 * The refund check needs the key's "Charges: Read" permission; without it, refunded originals
 * stay sold (the safe way round) and Cali can contact the buyer about it.
 */
export async function paidOriginals({ key, fetch: fetchImpl = fetch }) {
  const handles = new Set();
  let expand = true;
  let after;
  for (let page = 0; page < 50; page += 1) {
    const query = { limit: '100', 'created[gte]': String(SINCE) };
    if (expand) query['expand[]'] = 'data.latest_charge';
    if (after) query.starting_after = after;
    let result;
    try {
      result = await get('/payment_intents', query, { key, fetch: fetchImpl });
    } catch (error) {
      if (expand && error.status === 403) {
        expand = false;
        page -= 1;
        continue;
      }
      throw error;
    }
    for (const pi of result.data ?? []) {
      if (stillPaid(pi)) originalsIn(pi).forEach((h) => handles.add(h));
    }
    if (!result.has_more || !result.data?.length) break;
    after = result.data.at(-1).id;
  }
  return handles;
}

/** Products with the given originals marked sold (prints are made to order, so never). */
export function markSold(products, handles) {
  return products.map((p) => {
    if (!handles.has(p.handle) || !p.tags.includes('original') || !p.availableForSale) return p;
    const variants = p.variants.nodes.map((v) => ({
      ...v,
      availableForSale: false,
      quantityAvailable: 0,
    }));
    return { ...p, availableForSale: false, variants: { ...p.variants, nodes: variants } };
  });
}

/**
 * Checks a webhook really came from Stripe: the Stripe-Signature header is
 * t=<timestamp>,v1=<HMAC-SHA256 of "<timestamp>.<raw body>" with the endpoint's secret>.
 * Refuses anything older than five minutes, so a captured message can't be replayed.
 */
export function verifyStripeSignature(rawBody, header, secret, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.split('='));
  const timestamp = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(now / 1000 - timestamp) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((s) => {
    const given = Buffer.from(s, 'hex');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Whether a Stripe event changes what's for sale: a paid order with an original, or a refund. */
export function shouldRebuild(event) {
  const object = event?.data?.object ?? {};
  if (event?.type === 'checkout.session.completed') {
    return object.payment_status === 'paid' && Boolean(object.metadata?.originals);
  }
  if (event?.type === 'charge.refunded') return object.refunded === true;
  return false;
}
