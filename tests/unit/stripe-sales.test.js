import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  paidOriginals,
  markSold,
  originalsIn,
  verifyStripeSignature,
  shouldRebuild,
} from '../../scripts/stripe-sales.js';
import { sessionParams } from '../../scripts/checkout.js';

const pi = (id, metadata, { status = 'succeeded', refunded = false } = {}) => ({
  id,
  status,
  metadata,
  latest_charge: { refunded },
});

test('originalsIn reads checkout’s metadata', () => {
  assert.deepEqual(originalsIn({ metadata: { 'original_pink-check': 'yes', delivery: 'uk' } }), [
    'pink-check',
  ]);
  assert.deepEqual(originalsIn({}), []);
});

test('paidOriginals: every page, paid only, refunds put a piece back on sale', async () => {
  const pages = [
    {
      data: [
        pi('pi_1', { 'original_pink-check': 'yes' }),
        pi('pi_2', { original_swan: 'yes' }, { refunded: true }),
      ],
      has_more: true,
    },
    {
      data: [
        pi('pi_3', { original_big: 'yes' }, { status: 'requires_payment_method' }),
        pi('pi_4', { original_market: 'yes', delivery: 'uk' }),
      ],
      has_more: false,
    },
  ];
  const urls = [];
  const fetch = async (url) => {
    urls.push(new URL(url));
    return Response.json(pages[urls.length - 1]);
  };
  const handles = await paidOriginals({ key: 'rk_test_1', fetch });
  assert.deepEqual([...handles].sort(), ['market', 'pink-check']);
  assert.equal(urls[1].searchParams.get('starting_after'), 'pi_2');
  assert.equal(urls[0].searchParams.get('expand[]'), 'data.latest_charge');
});

test('paidOriginals: a key that can’t read charges still works (refunds then stay sold)', async () => {
  const urls = [];
  const fetch = async (url) => {
    const u = new URL(url);
    urls.push(u);
    if (u.searchParams.has('expand[]')) {
      return Response.json({ error: { message: 'no charges permission' } }, { status: 403 });
    }
    return Response.json({
      data: [{ id: 'pi_1', status: 'succeeded', metadata: { original_swan: 'yes' } }],
      has_more: false,
    });
  };
  assert.deepEqual([...(await paidOriginals({ key: 'rk', fetch }))], ['swan']);
  assert.equal(urls.length, 2);
});

test('markSold sells out originals only, leaving everything else untouched', () => {
  const product = (handle, tag) => ({
    handle,
    tags: [tag],
    availableForSale: true,
    variants: { nodes: [{ id: `${handle}/x`, availableForSale: true, quantityAvailable: 1 }] },
  });
  const products = [product('pink-check', 'original'), product('swan', 'print')];
  const marked = markSold(products, new Set(['pink-check', 'swan']));
  assert.equal(marked[0].availableForSale, false);
  assert.equal(marked[0].variants.nodes[0].quantityAvailable, 0);
  assert.equal(marked[1], products[1]);
  assert.equal(products[0].availableForSale, true, 'does not change the input');
});

test('webhook signatures: Stripe’s scheme, wrong secrets and old messages refused', () => {
  const secret = 'whsec_test';
  const body = '{"type":"checkout.session.completed"}';
  const t = 1_800_000_000;
  const sign = (s, time = t) =>
    `t=${time},v1=${createHmac('sha256', s).update(`${time}.${body}`).digest('hex')}`;
  const now = t * 1000 + 1000;
  assert.equal(verifyStripeSignature(body, sign(secret), secret, now), true);
  assert.equal(verifyStripeSignature(body, `${sign('x')},v1=00`, secret, now), false);
  assert.equal(verifyStripeSignature(`${body} `, sign(secret), secret, now), false);
  assert.equal(verifyStripeSignature(body, sign(secret, t - 600), secret, now), false);
  assert.equal(verifyStripeSignature(body, null, secret, now), false);
  assert.equal(verifyStripeSignature(body, sign(secret), '', now), false);
});

test('a rebuild only for paid orders with an original, or refunds', () => {
  const session = (metadata, payment_status = 'paid') => ({
    type: 'checkout.session.completed',
    data: { object: { payment_status, metadata } },
  });
  assert.equal(shouldRebuild(session({ originals: 'pink-check' })), true);
  assert.equal(shouldRebuild(session({ delivery: 'uk' })), false);
  assert.equal(shouldRebuild(session({ originals: 'x' }, 'unpaid')), false);
  assert.equal(
    shouldRebuild({ type: 'charge.refunded', data: { object: { refunded: true } } }),
    true,
  );
  assert.equal(
    shouldRebuild({ type: 'charge.refunded', data: { object: { refunded: false } } }),
    false,
  );
  assert.equal(shouldRebuild({ type: 'payout.paid', data: { object: {} } }), false);
});

test('checkout labels sessions that include originals, for the webhook', () => {
  const line = (handle, tag) => ({
    quantity: 1,
    merchandise: {
      title: 'Default Title',
      price: { amount: '10.0', currencyCode: 'GBP' },
      product: { title: handle, handle, tags: [tag] },
    },
  });
  const delivery = { id: 'uk', label: 'UK', amount: 4, countries: ['GB'] };
  const origin = 'https://calicomelton.com';
  const both = sessionParams({
    resolved: [line('pink-check', 'original'), line('swan', 'print')],
    delivery,
    origin,
  });
  assert.deepEqual(both.metadata, { delivery: 'uk', originals: 'pink-check' });
  const prints = sessionParams({ resolved: [line('swan', 'print')], delivery, origin });
  assert.deepEqual(prints.metadata, { delivery: 'uk' });
});
