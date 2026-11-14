import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, describePrice, priceInnerHtml } from '../../src/scripts/lib/money.js';

const gbp = (amount) => ({ amount, currencyCode: 'GBP' });

test('whole pounds have no pence', () => {
  assert.equal(formatMoney(gbp('450.0')), '£450');
  assert.equal(formatMoney(gbp('1200')), '£1,200');
});

test('other amounts show pence', () => {
  assert.equal(formatMoney(gbp('45.5')), '£45.50');
});

test('empty input formats to empty string', () => {
  assert.equal(formatMoney(null), '');
});

test('rejects garbage amounts', () => {
  assert.throws(() => formatMoney(gbp('abc')));
});

test('variant on sale', () => {
  assert.deepEqual(describePrice({ price: gbp('40.0'), compareAtPrice: gbp('55.0') }), {
    from: false,
    onSale: true,
    current: '£40',
    compareAt: '£55',
  });
});

test('compare-at lower than price is not a sale', () => {
  const view = describePrice({ price: gbp('40.0'), compareAtPrice: gbp('30.0') });
  assert.equal(view.onSale, false);
  assert.equal(view.compareAt, null);
});

test('product with a price range shows "from"', () => {
  const view = describePrice({
    priceRange: { minVariantPrice: gbp('45.0'), maxVariantPrice: gbp('120.0') },
    compareAtPriceRange: { minVariantPrice: gbp('0.0') },
  });
  assert.equal(view.from, true);
  assert.equal(view.current, '£45');
  assert.equal(view.onSale, false);
});

test('single-price product does not say "from"', () => {
  const view = describePrice({
    priceRange: { minVariantPrice: gbp('950.0'), maxVariantPrice: gbp('950.0') },
  });
  assert.equal(view.from, false);
});

test('price markup marks sale for screen readers', () => {
  const html = priceInnerHtml({ from: true, onSale: true, current: '£40', compareAt: '£55' });
  assert.match(html, /From<\/span> <span class="ds-price__current">£40/);
  assert.match(html, /on sale/);
  assert.match(
    html,
    /<s class="ds-price__compare"><span class="ds-visually-hidden">Was <\/span>£55<\/s>/,
  );
});
