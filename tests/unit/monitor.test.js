import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSite } from '../../scripts/monitor.js';

const CATALOG = { 'swan/a4': { product: { handle: 'swan' } } };

function fakeSite({
  health = { ok: true, checks: { catalogue: 'ok', stripe: 'ok, live mode' } },
  down = [],
} = {}) {
  return async (url) => {
    const path = new URL(url).pathname;
    if (down.includes(path)) return new Response('Bad gateway', { status: 502 });
    if (path === '/assets/data/catalog.json') return Response.json(CATALOG);
    if (path === '/api/health') return Response.json(health, { status: health.ok ? 200 : 503 });
    if (path === '/') return new Response('<title>Calico Melton</title>');
    if (path === '/shop/') return new Response('<ul class="ds-card-grid">');
    if (path === '/shop/swan/') return new Response('<button>Add to basket</button>');
    return new Response('Not found', { status: 404 });
  };
}

test('a healthy site passes every check', async () => {
  const results = await checkSite('https://calicomelton.com', { fetch: fakeSite() });
  assert.deepEqual(
    results.map((r) => [r.name, r.ok]),
    [
      ['Home page', true],
      ['Shop page', true],
      ['A product page', true],
      ['Checkout and Stripe (/api/health)', true],
    ],
  );
  assert.match(results[3].detail, /stripe: ok, live mode/);
});

test('a page down or Stripe failing is reported', async () => {
  const results = await checkSite('https://calicomelton.com', {
    fetch: fakeSite({
      down: ['/shop/'],
      health: { ok: false, checks: { catalogue: 'ok', stripe: 'Stripe said 401' } },
    }),
  });
  const failed = results.filter((r) => !r.ok);
  assert.deepEqual(
    failed.map((r) => [r.name, r.detail]),
    [
      ['Shop page', 'HTTP 502'],
      ['Checkout and Stripe (/api/health)', 'catalogue: ok; stripe: Stripe said 401'],
    ],
  );
});
