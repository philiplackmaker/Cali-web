import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadShop } from '../../scripts/shop.js';

test('without a sheet, the build uses the local copy of Cali’s sheet', async () => {
  delete process.env.SHEET_CSV_URL;
  delete process.env.SHOP_FIXTURE;
  const shop = await loadShop();
  assert.equal(shop.source, 'local');
  assert.equal(shop.products.length, 8);
  assert.equal(shop.hasOriginals, false);
  assert.deepEqual(
    shop.collections.map((c) => c.url),
    ['/shop/', '/shop/originals/', '/shop/prints/'],
  );
  assert.ok(shop.byHandle['blue-tulips']);
  // No photos tab: the hero is the first painting, the studio band its other views.
  assert.equal(shop.photos.homeHero.image.url, shop.products[0].featuredImage.url);
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
