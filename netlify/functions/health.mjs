// GET /api/health: is the shop able to sell? Checked every 30 minutes by
// .github/workflows/monitor.yml. 200 with { ok: true } when:
//   - the catalogue (/assets/data/catalog.json) loads and has something for sale
//   - STRIPE_SECRET_KEY is set and Stripe accepts it
// Otherwise 503, with which check failed. Never shows the key.
const json = (body, status) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export default async (request) => {
  const origin = new URL(request.url).origin;
  const checks = {};

  try {
    const res = await fetch(new URL('/assets/data/catalog.json', origin));
    const catalog = await res.json();
    const forSale = Object.values(catalog).filter((v) => v.availableForSale).length;
    checks.catalogue = forSale > 0 ? `ok, ${forSale} for sale` : 'nothing for sale';
  } catch (error) {
    checks.catalogue = `can't load: ${error.message}`;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) checks.stripe = 'STRIPE_SECRET_KEY is not set';
  else {
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${key}` },
      });
      checks.stripe = res.ok
        ? `ok, ${key.startsWith('sk_live_') ? 'live' : 'test'} mode`
        : `Stripe said ${res.status}`;
    } catch (error) {
      checks.stripe = `can't reach Stripe: ${error.message}`;
    }
  }

  const ok = Object.values(checks).every((c) => c.startsWith('ok'));
  return json({ ok, checks, time: new Date().toISOString() }, ok ? 200 : 503);
};

export const config = { path: '/api/health' };
