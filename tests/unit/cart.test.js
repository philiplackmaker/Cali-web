import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCartStore, COPY } from '../../src/scripts/cart.js';
import { createLocalCart } from '../../src/scripts/local-cart.js';

const gbp = (amount) => ({ amount, currencyCode: 'GBP' });

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function setup({ fail } = {}) {
  const catalog = {
    'v-original': {
      id: 'v-original',
      title: 'Default Title',
      availableForSale: true,
      quantityAvailable: 1,
      price: gbp('950.0'),
      selectedOptions: [],
      product: { title: 'Sun Hat', handle: 'sun-hat', tags: ['original'] },
    },
    'v-print-a4': {
      id: 'v-print-a4',
      title: 'A4 / Cotton rag',
      availableForSale: true,
      quantityAvailable: 20,
      price: gbp('45.0'),
      selectedOptions: [],
      product: { title: 'Tulip', handle: 'tulip', tags: ['print'] },
    },
  };
  const storage = memoryStorage();
  const client = createLocalCart({ catalog: async () => catalog, storage, fail });
  const store = createCartStore({ client, storage });
  return { catalog, storage, store };
}

test('adding creates a cart, saves its id and announces it', async () => {
  const { store, storage } = setup();
  const messages = [];
  store.events.addEventListener('change', (e) => messages.push(e.detail.message));
  const { cart, message } = await store.add('v-print-a4', 2);
  assert.equal(cart.totalQuantity, 2);
  assert.equal(cart.cost.subtotalAmount.amount, '90.00');
  assert.equal(storage.getItem('ds-cart-id'), cart.id);
  assert.equal(message, COPY.added('“Tulip” (A4 / Cotton rag)'));
  assert.deepEqual(messages, [message]);
});

test('adding the same variant again increases its line', async () => {
  const { store } = setup();
  await store.add('v-print-a4', 1);
  const { cart } = await store.add('v-print-a4', 1);
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].quantity, 2);
});

test('update changes quantity, zero removes', async () => {
  const { store } = setup();
  const { cart } = await store.add('v-print-a4', 1);
  const lineId = cart.lines[0].id;
  assert.equal((await store.update(lineId, 3)).cart.totalQuantity, 3);
  const removed = await store.update(lineId, 0);
  assert.equal(removed.cart.totalQuantity, 0);
  assert.equal(removed.message, COPY.removed('“Tulip” (A4 / Cotton rag)'));
});

test('an original is capped at one', async () => {
  const { store } = setup();
  await store.add('v-original', 1);
  const result = await store.add('v-original', 1);
  assert.equal(result.cart.lines[0].quantity, 1);
  assert.equal(result.warning, true);
});

test('an original sold to someone else comes back out of the cart with a clear message', async () => {
  const { store, catalog } = setup();
  await store.add('v-original', 1);
  await store.add('v-print-a4', 1);
  catalog['v-original'].availableForSale = false;
  const result = await store.add('v-print-a4', 1);
  assert.equal(result.cart.lines.length, 1);
  assert.equal(result.message, COPY.soldOut('“Sun Hat”'));
});

test('load restores a saved cart', async () => {
  const { store, storage } = setup();
  await store.add('v-print-a4', 1);
  const client2 = createLocalCart({
    catalog: async () => ({}),
    storage,
  });
  // Same storage, fresh store: a page reload.
  const reloaded = createCartStore({ client: client2, storage });
  const cart = await reloaded.load();
  assert.ok(cart.id);
});

test('when the API is down, the store throws the offline message and emits an error', async () => {
  const { store } = setup({ fail: () => true });
  let errored = false;
  store.events.addEventListener('error', () => (errored = true));
  await assert.rejects(store.add('v-print-a4', 1), { message: COPY.offline });
  assert.equal(errored, true);
});

test('operations run in order even when fired together', async () => {
  const { store } = setup();
  await Promise.all([
    store.add('v-print-a4', 1),
    store.add('v-print-a4', 1),
    store.add('v-print-a4', 1),
  ]);
  assert.equal(store.count, 3);
});

test('on load, a line that sold elsewhere is removed with a clear message', async () => {
  const { store, catalog, storage } = setup();
  await store.add('v-original', 1);
  await store.add('v-print-a4', 1);
  catalog['v-original'].availableForSale = false; // another buyer checked out
  const client = createLocalCart({ catalog: async () => catalog, storage });
  const reloaded = createCartStore({ client, storage });
  let detail;
  reloaded.events.addEventListener('change', (e) => (detail = e.detail));
  const cart = await reloaded.load();
  assert.deepEqual(
    cart.lines.map((l) => l.merchandise.id),
    ['v-print-a4'],
  );
  assert.equal(detail.message, COPY.soldOut('“Sun Hat”'));
  assert.equal(detail.warning, true);
});
