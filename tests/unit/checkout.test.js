import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCheckoutForm,
  resolveLines,
  sessionParams,
  encodeForm,
  createCheckout,
  CheckoutError,
  WORLD_COUNTRIES,
} from '../../scripts/checkout.js';

const gbp = (amount) => ({ amount, currencyCode: 'GBP' });
const IMAGE = { url: '/assets/images/art/swan-1-{width}.webp', width: 1440, height: 2000 };

const catalog = {
  'swan/a4': {
    id: 'swan/a4',
    title: 'A4',
    availableForSale: true,
    quantityAvailable: 20,
    price: gbp('24.0'),
    image: IMAGE,
    product: { title: 'Swan', handle: 'swan', tags: ['print'] },
  },
  'swan/a3': {
    id: 'swan/a3',
    title: 'A3',
    availableForSale: false,
    quantityAvailable: 0,
    price: gbp('30.0'),
    image: IMAGE,
    product: { title: 'Swan', handle: 'swan', tags: ['print'] },
  },
  'pink-check/original': {
    id: 'pink-check/original',
    title: 'Default Title',
    availableForSale: true,
    quantityAvailable: 1,
    price: gbp('480.0'),
    image: IMAGE,
    product: { title: 'Pink Check', handle: 'pink-check', tags: ['original'] },
  },
  'big/original': {
    id: 'big/original',
    title: 'Default Title',
    availableForSale: true,
    quantityAvailable: 1,
    price: gbp('0.0'),
    image: IMAGE,
    product: { title: 'Big One', handle: 'big', tags: ['original', 'price-on-request'] },
  },
};

const DELIVERY = [
  { id: 'uk', label: 'UK', amount: 4, countries: ['GB'] },
  { id: 'world', label: 'Rest of the world', amount: 12, countries: 'world' },
];

test('the basket form: id + quantity pairs, merged; or a no-JS buy button', () => {
  const basket = new URLSearchParams(
    'id=swan/a4&quantity=2&id=pink-check/original&quantity=1&id=swan/a4&quantity=1&delivery=world',
  );
  assert.deepEqual(parseCheckoutForm(basket), {
    lines: [
      { id: 'swan/a4', quantity: 3 },
      { id: 'pink-check/original', quantity: 1 },
    ],
    delivery: 'world',
  });
  // The product form also carries its own hidden id; the button's value wins.
  const buy = new URLSearchParams('id=swan/a4&quantity=2&buy=swan/a3&delivery=uk');
  assert.deepEqual(parseCheckoutForm(buy).lines, [{ id: 'swan/a3', quantity: 2 }]);
});

test('lines are checked against the catalogue, not trusted from the page', () => {
  const err = (lines) => {
    try {
      resolveLines(lines, catalog);
    } catch (e) {
      assert.ok(e instanceof CheckoutError);
      return e;
    }
    assert.fail('expected a CheckoutError');
  };
  assert.match(err([]).message, /empty/);
  assert.match(err([{ id: 'nope', quantity: 1 }]).message, /isn’t in the shop/);
  assert.equal(err([{ id: 'swan/a3', quantity: 1 }]).status, 409);
  assert.match(err([{ id: 'pink-check/original', quantity: 2 }]).message, /between 1 and 1/);
  assert.match(err([{ id: 'swan/a4', quantity: 21 }]).message, /between 1 and 20/);
  assert.match(err([{ id: 'swan/a4', quantity: 1.5 }]).message, /between/);
  assert.match(err([{ id: 'big/original', quantity: 1 }]).message, /by enquiry/);
  assert.equal(resolveLines([{ id: 'swan/a4', quantity: 2 }], catalog)[0].quantity, 2);
});

test('the Stripe session: prices in pence from the catalogue, delivery, countries', () => {
  const resolved = resolveLines(
    [
      { id: 'swan/a4', quantity: 2 },
      { id: 'pink-check/original', quantity: 1 },
    ],
    catalog,
  );
  const params = sessionParams({
    resolved,
    delivery: DELIVERY[0],
    origin: 'https://calicomelton.com',
  });
  assert.equal(params.mode, 'payment');
  assert.equal(
    params.success_url,
    'https://calicomelton.com/order-thanks/?session_id={CHECKOUT_SESSION_ID}',
  );
  assert.equal(params.cancel_url, 'https://calicomelton.com/cart/');
  const [swan, pink] = params.line_items;
  assert.equal(swan.quantity, 2);
  assert.equal(swan.price_data.unit_amount, 2400);
  assert.equal(swan.price_data.currency, 'gbp');
  assert.equal(swan.price_data.product_data.name, 'Swan, A4');
  assert.deepEqual(swan.price_data.product_data.images, [
    'https://calicomelton.com/assets/images/art/swan-1-640.webp',
  ]);
  assert.equal(pink.price_data.product_data.name, 'Pink Check');
  assert.deepEqual(params.shipping_address_collection.allowed_countries, ['GB']);
  assert.equal(params.shipping_options[0].shipping_rate_data.fixed_amount.amount, 400);
  assert.deepEqual(params.payment_intent_data.metadata, { 'original_pink-check': 'yes' });

  const world = sessionParams({ resolved, delivery: DELIVERY[1], origin: 'https://x.test' });
  assert.equal(world.shipping_address_collection.allowed_countries, WORLD_COUNTRIES);
  assert.ok(!WORLD_COUNTRIES.includes('GB'));
});

test('encodeForm writes Stripe’s nested form encoding', () => {
  const body = encodeForm({ a: 1, line_items: [{ price_data: { unit_amount: 2400 } }], b: null });
  assert.equal(
    decodeURIComponent(body.toString()),
    'a=1&line_items[0][price_data][unit_amount]=2400',
  );
});

function fakeStripe({ soldHandles = [] } = {}) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.headers.Authorization, 'Bearer sk_test_123');
    if (url.includes('/payment_intents/search')) {
      const sold = soldHandles.some((h) => decodeURIComponent(url).includes(`original_${h}`));
      return Response.json({ data: sold ? [{ id: 'pi_1' }] : [] });
    }
    return Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
  };
  return { fetch, calls };
}

test('createCheckout returns the Stripe Checkout URL', async () => {
  const { fetch, calls } = fakeStripe();
  const url = await createCheckout({
    form: new URLSearchParams('id=swan/a4&quantity=1&id=pink-check/original&quantity=1'),
    catalog,
    deliveryOptions: DELIVERY,
    origin: 'https://calicomelton.com',
    key: 'sk_test_123',
    fetch,
  });
  assert.equal(url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  const session = calls.at(-1);
  assert.equal(session.url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.equal(session.init.method, 'POST');
  // No delivery chosen: the first option (UK).
  assert.match(decodeURIComponent(session.init.body), /allowed_countries\]\[0\]=GB/);
});

test('an original already paid for (since the build) is refused', async () => {
  const { fetch, calls } = fakeStripe({ soldHandles: ['pink-check'] });
  await assert.rejects(
    createCheckout({
      form: new URLSearchParams('id=pink-check/original&quantity=1'),
      catalog,
      deliveryOptions: DELIVERY,
      origin: 'https://calicomelton.com',
      key: 'sk_test_123',
      fetch,
    }),
    (e) => e instanceof CheckoutError && /Pink Check has just sold/.test(e.message),
  );
  assert.ok(!calls.some((c) => c.url.includes('/checkout/sessions')));
});
