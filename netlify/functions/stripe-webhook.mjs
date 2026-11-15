// POST /api/stripe-webhook: Stripe calls this after each payment and refund. When an order
// with an original is paid (or anything is refunded), it starts a rebuild, and the build marks
// the piece Sold (scripts/stripe-sales.js). One rebuild is one production deploy (15 credits).
//
// Set up once in Stripe → Developers → Webhooks → Add endpoint:
//   URL https://calicomelton.com/api/stripe-webhook
//   events checkout.session.completed and charge.refunded
// then copy its signing secret (whsec_…) into Netlify as STRIPE_WEBHOOK_SECRET.
// Also needs NETLIFY_BUILD_HOOK_URL (shared with the nightly Instagram rebuild).
import { verifyStripeSignature, shouldRebuild } from '../../scripts/stripe-sales.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  }
  const body = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set.');
    return new Response('Not set up', { status: 500 });
  }
  if (!verifyStripeSignature(body, request.headers.get('stripe-signature'), secret)) {
    console.warn('[stripe-webhook] Refused a message without a valid Stripe signature.');
    return new Response('Bad signature', { status: 400 });
  }
  const event = JSON.parse(body);
  if (!shouldRebuild(event)) return new Response(`Nothing to do for ${event.type}`);

  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) {
    console.error('[stripe-webhook] NETLIFY_BUILD_HOOK_URL is not set: the shop can’t update.');
    return new Response('No build hook', { status: 500 });
  }
  const res = await fetch(`${hook}?trigger_title=${encodeURIComponent(`Stripe: ${event.type}`)}`, {
    method: 'POST',
    body: '{}',
  });
  console.log(
    `[stripe-webhook] ${event.type}: rebuild ${res.ok ? 'started' : `failed (${res.status})`}.`,
  );
  // A failure here makes Stripe retry later, which is what we want.
  return new Response(res.ok ? 'Rebuild started' : 'Build hook failed', {
    status: res.ok ? 200 : 502,
  });
};

export const config = { path: '/api/stripe-webhook' };
