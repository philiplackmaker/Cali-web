import { test } from 'node:test';
import assert from 'node:assert/strict';

// shop.js caches per process, so each test imports a fresh copy.
const freshShop = (tag) => import(`../../src/_data/shop.js?${tag}`).then((m) => m.default());

test('without Shopify settings, the build uses the mock catalogue', async () => {
  delete process.env.SHOPIFY_STORE_DOMAIN;
  delete process.env.SHOPIFY_STOREFRONT_TOKEN;
  const shop = await freshShop('mock');
  assert.equal(shop.mode, 'mock');
  assert.ok(shop.products.length > 0);
  assert.deepEqual(
    shop.collections.map((c) => c.url),
    ['/shop/', '/shop/originals/', '/shop/prints/'],
  );
});

test('with Shopify settings, the build pages through products and reads site photos', async (t) => {
  process.env.SHOPIFY_STORE_DOMAIN = 'cali.myshopify.com';
  process.env.SHOPIFY_STOREFRONT_TOKEN = 'tok';
  const { default: mock } = await import('../../src/_data/mock.js');
  const pages = [mock.products.slice(0, 5), mock.products.slice(5)];
  let productCalls = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const { query, variables } = JSON.parse(init.body);
    let data;
    if (query.includes('products(')) {
      const page = productCalls++;
      assert.equal(variables.after, page === 0 ? null : 'cursor-1');
      data = {
        products: {
          pageInfo: { hasNextPage: page === 0, endCursor: page === 0 ? 'cursor-1' : null },
          nodes: pages[page],
        },
      };
    } else {
      data = { metaobjects: { nodes: [] } };
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  });
  const shop = await freshShop('live');
  assert.equal(shop.mode, 'storefront');
  assert.equal(shop.domain, 'cali.myshopify.com');
  assert.equal(productCalls, 2);
  assert.equal(shop.products.length, mock.products.length);
  // No site photos in Shopify yet: the hero falls back to the newest painting.
  assert.equal(shop.photos.homeHero.image.url, mock.products[0].featuredImage.url);
  assert.equal(shop.policiesUrl, 'https://cali.myshopify.com/policies');
  delete process.env.SHOPIFY_STORE_DOMAIN;
  delete process.env.SHOPIFY_STOREFRONT_TOKEN;
});
