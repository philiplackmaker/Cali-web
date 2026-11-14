import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { loadShop } from '../../scripts/shop.js';

test('the build reads Cali’s products from content/ (what /admin/ edits)', async () => {
  delete process.env.SHOP_FIXTURE;
  const shop = await loadShop({ outputDir: '_site' });
  assert.equal(shop.source, 'content');
  // Everything published in the admin (with a photo) is in the shop.
  const entries = readdirSync('content/products')
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`content/products/${f}`, 'utf8')))
    .filter((e) => e.published !== false && e.images?.length);
  assert.equal(shop.products.length, entries.length);
  assert.equal(
    shop.hasOriginals,
    entries.some((e) => e.type === 'Original'),
  );
  assert.deepEqual(
    shop.collections.map((c) => c.url),
    ['/shop/', '/shop/originals/', '/shop/prints/'],
  );
  assert.ok(shop.byHandle['blue-tulips']);
  // The home picture is the one set in Site photos, or else the newest painting.
  const photos = JSON.parse(readFileSync('content/photos.json', 'utf8'));
  if (photos.homeHero?.image) assert.match(shop.photos.homeHero.image.url, /photo-home-1-/);
  else assert.equal(shop.photos.homeHero.image.url, shop.products[0].featuredImage.url);
  assert.equal(Boolean(shop.photos.homeHero.video), Boolean(photos.homeHero?.video));
  assert.equal(shop.photos.studio.length, 3);
});

test('SHOP_FIXTURE=mock uses the test products, with originals and sold work', async () => {
  process.env.SHOP_FIXTURE = 'mock';
  const shop = await loadShop();
  delete process.env.SHOP_FIXTURE;
  assert.equal(shop.source, 'fixture');
  assert.equal(shop.hasOriginals, true);
  assert.ok(shop.byHandle['afternoon-montpelier']);
});
