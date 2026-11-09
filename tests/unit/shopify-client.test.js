import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  storefrontRequest,
  createStorefrontClient,
  normaliseSitePhotos,
  cartPermalink,
  QUERIES,
  API_VERSION,
} from '../../src/scripts/shopify-client.js';
import { createCartStore, COPY } from '../../src/scripts/cart.js';

const gbp = (amount) => ({ amount, currencyCode: 'GBP' });

/** A fake fetch that records calls and answers from a handler: (query, variables) → data. */
function fakeFetch(handler) {
  const calls = [];
  const fetch = async (url, init) => {
    const { query, variables } = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, query, variables });
    const out = await handler(query, variables);
    if (out instanceof Response) return out;
    return new Response(JSON.stringify(out.errors ? out : { data: out }), { status: 200 });
  };
  return { fetch, calls };
}

const variant = (id, extra = {}) => ({
  id,
  title: 'A4 / Cotton rag',
  availableForSale: true,
  quantityAvailable: 20,
  price: gbp('55.0'),
  compareAtPrice: null,
  selectedOptions: [],
  image: null,
  product: { id: 'p1', title: 'Tulip', handle: 'tulip', tags: ['print'] },
  ...extra,
});

const cartPayload = (lines, warnings = []) => ({
  cart: {
    id: 'gid://shopify/Cart/c1',
    checkoutUrl: 'https://shop.example/checkouts/c1',
    totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
    cost: { subtotalAmount: gbp('55.0') },
    lines: { nodes: lines },
  },
  userErrors: [],
  warnings,
});

test('requests the right endpoint with the public token', async () => {
  const { fetch, calls } = fakeFetch(() => ({ product: null }));
  await storefrontRequest({ domain: 'shop.example', token: 'tok', fetch }, QUERIES.availability, {
    handle: 'x',
  });
  assert.equal(calls[0].url, `https://shop.example/api/${API_VERSION}/graphql.json`);
  assert.equal(calls[0].headers['X-Shopify-Storefront-Access-Token'], 'tok');
  assert.deepEqual(calls[0].variables, { handle: 'x' });
  assert.match(calls[0].query, /@inContext\(country: GB/);
});

test('GraphQL and HTTP errors throw', async () => {
  const gql = fakeFetch(() => ({ errors: [{ message: 'Access denied' }] }));
  await assert.rejects(
    storefrontRequest({ domain: 'd', token: 't', fetch: gql.fetch }, '{ shop { name } }'),
    /Access denied/,
  );
  const http = fakeFetch(() => new Response('nope', { status: 503, statusText: 'Unavailable' }));
  await assert.rejects(
    storefrontRequest({ domain: 'd', token: 't', fetch: http.fetch }, '{ shop { name } }'),
    /503/,
  );
});

test('cart mutations come back with plain line arrays, warnings intact', async () => {
  const line = {
    id: 'l1',
    quantity: 1,
    cost: { totalAmount: gbp('55.0') },
    merchandise: variant('v1'),
  };
  const { fetch, calls } = fakeFetch((query) => {
    if (query.includes('cartCreate')) return { cartCreate: cartPayload([line]) };
    if (query.includes('cartLinesAdd'))
      return {
        cartLinesAdd: cartPayload(
          [line],
          [{ code: 'MERCHANDISE_NOT_ENOUGH_STOCK', target: 'v1', message: '' }],
        ),
      };
  });
  const client = createStorefrontClient({ domain: 'd', token: 't', fetch });
  const created = await client.cartCreate({ lines: [{ merchandiseId: 'v1', quantity: 1 }] });
  assert.ok(Array.isArray(created.cart.lines));
  assert.deepEqual(calls[0].variables, {
    input: { lines: [{ merchandiseId: 'v1', quantity: 1 }] },
  });
  const added = await client.cartLinesAdd('gid://shopify/Cart/c1', [
    { merchandiseId: 'v1', quantity: 5 },
  ]);
  assert.equal(added.warnings[0].code, 'MERCHANDISE_NOT_ENOUGH_STOCK');
});

test('the cart store works over the real client, including Shopify warnings', async () => {
  const line = {
    id: 'l1',
    quantity: 1,
    cost: { totalAmount: gbp('55.0') },
    merchandise: variant('v1'),
  };
  const { fetch } = fakeFetch((query) => {
    if (query.includes('cartCreate')) return { cartCreate: cartPayload([line]) };
    if (query.includes('cartLinesAdd'))
      return {
        cartLinesAdd: cartPayload(
          [],
          [{ code: 'MERCHANDISE_OUT_OF_STOCK', target: 'v1', message: '' }],
        ),
      };
  });
  const m = new Map();
  const storage = {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
  const store = createCartStore({
    client: createStorefrontClient({ domain: 'd', token: 't', fetch }),
    storage,
  });
  await store.add('v1', 1);
  assert.equal(storage.getItem('ds-cart-id'), 'gid://shopify/Cart/c1');
  const result = await store.add('v1', 1);
  assert.equal(result.message, COPY.soldOut('“Tulip” (A4 / Cotton rag)'));
});

test('an expired or completed cart reads as null', async () => {
  const { fetch } = fakeFetch(() => ({ cart: null }));
  assert.equal(await createStorefrontClient({ domain: 'd', token: 't', fetch }).cart('old'), null);
});

test('availability returns live variants, or null for a deleted product', async () => {
  const { fetch } = fakeFetch((q, v) =>
    v.handle === 'gone'
      ? { product: null }
      : {
          product: {
            availableForSale: false,
            variants: { nodes: [variant('v1', { availableForSale: false })] },
          },
        },
  );
  const client = createStorefrontClient({ domain: 'd', token: 't', fetch });
  const live = await client.availability('tulip');
  assert.equal(live.availableForSale, false);
  assert.equal(live.variants[0].availableForSale, false);
  assert.equal(await client.availability('gone'), null);
});

test('site photos are sorted, placed, and take alt text from the field', () => {
  const node = (
    placement,
    order,
    alt,
    url = `https://cdn.shopify.com/${placement}${order}.jpg`,
  ) => ({
    handle: `${placement}-${order}`,
    fields: [
      { key: 'placement', value: placement },
      { key: 'order', value: String(order) },
      { key: 'alt_text', value: alt },
      {
        key: 'image',
        value: 'gid://shopify/MediaImage/1',
        reference: { image: { url, width: 1000, height: 1200, altText: null } },
      },
    ],
  });
  const photos = normaliseSitePhotos([
    node('studio', 2, 'Second'),
    node('home-hero', 0, 'The hero'),
    node('studio', 1, 'First'),
    { handle: 'broken', fields: [{ key: 'placement', value: 'studio' }] },
  ]);
  assert.equal(photos.homeHero.image.altText, 'The hero');
  assert.equal(photos.aboutPortrait, null);
  assert.deepEqual(
    photos.studio.map((p) => p.image.altText),
    ['First', 'Second'],
  );
});

test('cart permalinks use the numeric variant id', () => {
  assert.equal(
    cartPermalink('cali.myshopify.com', 'gid://shopify/ProductVariant/4242', 2),
    'https://cali.myshopify.com/cart/4242:2',
  );
});
