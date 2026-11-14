import { test } from 'node:test';
import assert from 'node:assert/strict';
import mock from '../../src/_data/mock.js';
import {
  optionStates,
  productBadges,
  productSummary,
  isPriceOnRequest,
} from '../../src/scripts/lib/product.js';

const print = mock.byHandle['sun-hat-with-tulip-print'];

test('option states check the selected variant and flag sold-out combinations', () => {
  const a2Matte = print.variants.nodes.find((v) => v.title === 'A2 / Smooth matte');
  const [size, paper] = optionStates(print, a2Matte);
  assert.deepEqual(
    size.values.map((v) => [v.name, v.checked, v.available]),
    [
      ['A4', false, true],
      ['A3', false, true],
      ['A2', true, true],
    ],
  );
  // A2 on cotton rag is sold out in the mock.
  assert.deepEqual(
    paper.values.map((v) => [v.name, v.checked, v.available]),
    [
      ['Smooth matte', true, true],
      ['Cotton rag', false, false],
    ],
  );
});

test('badges and summary for an original and a print', () => {
  assert.deepEqual(
    productBadges(mock.byHandle['afternoon-montpelier']).map((b) => b.kind),
    ['sold', 'original'],
  );
  assert.deepEqual(productBadges(print), [{ kind: 'print' }, { kind: 'edition', edition: 50 }]);
  assert.equal(
    productSummary(mock.byHandle['sun-hat-with-tulip']),
    'Oil on canvas · 60 × 80 cm · 2026',
  );
  assert.equal(productSummary(print), 'Giclée print · A4, A3, A2');
});

test('price on request comes from the price-on-request tag', () => {
  assert.equal(isPriceOnRequest(mock.byHandle['large-interior-redland']), true);
  assert.equal(isPriceOnRequest(mock.byHandle['sun-hat-with-tulip']), false);
});
