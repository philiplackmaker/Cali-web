import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postageFor, availableOptions, ukOnly } from '../../src/scripts/lib/delivery.js';

const UK = { id: 'uk', amount: 4 };
const WORLD = { id: 'world', amount: 12 };
const print = { shipping: { postage: null, ukOnly: false } };
const horse = { shipping: { postage: 15, ukOnly: true } };
const daisies = { shipping: { postage: 3, ukOnly: true } };

test('one parcel: the basket pays the single highest postage', () => {
  assert.equal(postageFor(UK, [horse, daisies]), 15);
  assert.equal(postageFor(UK, [daisies]), 3);
  // A print without its own postage counts as the option's price.
  assert.equal(postageFor(UK, [daisies, print]), 4);
  assert.equal(postageFor(UK, [horse, print]), 15);
  assert.equal(postageFor(WORLD, [print]), 12);
  assert.equal(postageFor(UK, []), 4);
});

test('anything UK only means UK delivery only', () => {
  assert.equal(ukOnly([print]), false);
  assert.equal(ukOnly([print, daisies]), true);
  assert.deepEqual(availableOptions([UK, WORLD], [print]), [UK, WORLD]);
  assert.deepEqual(availableOptions([UK, WORLD], [print, horse]), [UK]);
});
