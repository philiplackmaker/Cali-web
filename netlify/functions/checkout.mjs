// POST /api/checkout: the basket's Checkout button (and the no-JS buy buttons) post here.
// Checks the basket against this deploy's catalogue, creates a Stripe Checkout Session and
// sends the buyer to Stripe's payment page. Problems get a plain page with a way back.
// Needs STRIPE_SECRET_KEY (Netlify → Site configuration → Environment variables).
import { createCheckout, CheckoutError } from '../../scripts/checkout.js';
import site from '../../src/_data/site.js';

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

function problemPage(message, status) {
  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Checkout · ${site.name}</title>
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
<main class="ds-section"><div class="ds-section__inner ds-prose">
<h1>Checkout couldn’t start</h1>
<p>${escapeHtml(message)}</p>
<p><a href="/cart/">Back to your basket</a> · <a href="/contact/">Send me a message</a></p>
</div></main>
</body>
</html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('[checkout] STRIPE_SECRET_KEY is not set.');
    return problemPage(
      'Payments aren’t switched on just yet. Please send me a message and I’ll sort it out.',
      503,
    );
  }
  const origin = new URL(request.url).origin;
  try {
    const catalogRes = await fetch(new URL('/assets/data/catalog.json', origin));
    if (!catalogRes.ok) throw new Error(`catalog.json ${catalogRes.status}`);
    const url = await createCheckout({
      form: new URLSearchParams(await request.text()),
      catalog: await catalogRes.json(),
      deliveryOptions: site.delivery,
      origin,
      key,
      fetch,
    });
    return new Response(null, { status: 303, headers: { Location: url } });
  } catch (error) {
    if (error instanceof CheckoutError) return problemPage(error.message, error.status);
    console.error(`[checkout] ${error.message}`);
    return problemPage(
      'Something went wrong on my side. Please try again in a minute, or send me a message.',
      502,
    );
  }
};

export const config = { path: '/api/checkout' };
