import { test } from 'node:test';
import assert from 'node:assert/strict';
import mock from '../../src/_data/mock.js';
import site from '../../src/_data/site.js';
import { productJsonLd, artistJsonLd } from '../../src/scripts/lib/structured-data.js';

const s = { ...site, url: 'https://calicomelton.com' };

test('an original has a single in-stock offer with absolute images', () => {
  const ld = productJsonLd(mock.byHandle['sun-hat-with-tulip'], s);
  assert.equal(ld['@type'], 'Product');
  assert.equal(ld.offers['@type'], 'Offer');
  assert.equal(ld.offers.price, '950.00');
  assert.equal(ld.offers.priceCurrency, 'GBP');
  assert.equal(ld.offers.availability, 'https://schema.org/InStock');
  assert.ok(ld.image.every((u) => u.startsWith('https://calicomelton.com/')));
  assert.equal(ld.url, 'https://calicomelton.com/shop/sun-hat-with-tulip/');
});

test('a sold original says SoldOut', () => {
  const ld = productJsonLd(mock.byHandle['afternoon-montpelier'], s);
  assert.equal(ld.offers.availability, 'https://schema.org/SoldOut');
});

test('a print has an aggregate offer with per-variant availability', () => {
  const ld = productJsonLd(mock.byHandle['sun-hat-with-tulip-print'], s);
  assert.equal(ld.offers['@type'], 'AggregateOffer');
  assert.equal(ld.offers.lowPrice, '45.00');
  assert.equal(ld.offers.highPrice, '130.00');
  assert.equal(ld.offers.offerCount, 6);
  assert.equal(ld.offers.offers.filter((o) => o.availability.endsWith('SoldOut')).length, 1);
});

test('price on request has no offer', () => {
  assert.equal(productJsonLd(mock.byHandle['large-interior-redland'], s).offers, undefined);
});

test('the artist links to Instagram, and publishes the site', () => {
  const [artist, website] = artistJsonLd(s)['@graph'];
  assert.deepEqual(artist.sameAs, ['https://www.instagram.com/calicomelton/']);
  assert.equal(website['@type'], 'WebSite');
  assert.equal(website.publisher['@id'], artist['@id']);
});

test('offers carry UK postage and the returns policy (needed for Google Shopping)', () => {
  const ld = productJsonLd(mock.byHandle['pink-check'], s);
  assert.equal(ld.offers.shippingDetails.shippingRate.value, '8.00'); // its own postage
  assert.equal(ld.offers.shippingDetails.shippingDestination.addressCountry, 'GB');
  assert.equal(ld.offers.hasMerchantReturnPolicy.merchantReturnDays, 14);
  const print = productJsonLd(mock.byHandle['small-tulip-print'], s);
  assert.equal(print.offers.shippingDetails.shippingRate.value, '4.00'); // Settings → UK
});
