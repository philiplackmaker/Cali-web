// Settings Cali edits at /admin/ → Settings (content/settings.json): delivery prices and times.
import settings from '../../content/settings.json' with { type: 'json' };

// Where each delivery option goes. Stripe only accepts addresses in these countries.
const COUNTRIES = { uk: ['GB'], world: 'world' };

export default {
  name: 'Calico Melton',
  url: process.env.URL ?? 'https://calicomelton.com',
  // Netlify sets CONTEXT. Deploy previews and branch deploys stay out of search engines,
  // so only the production site is indexed. Local builds count as production.
  indexable: !process.env.CONTEXT || process.env.CONTEXT === 'production',
  lang: 'en-GB',
  locale: 'en_GB',
  currency: 'GBP',
  description:
    'Original paintings and prints by Calico Melton, a Bristol painter. New work, studio notes, and first access to prints.',
  instagram: 'https://www.instagram.com/calicomelton/',
  instagramHandle: '@calicomelton',
  email: 'calicomelton@gmail.com',

  // Visitor stats: Cloudflare Web Analytics (free, no cookies, so no consent banner). Only on
  // the production site, and only once the token is set on Netlify (README → Monitoring).
  analyticsToken:
    !process.env.CONTEXT || process.env.CONTEXT === 'production'
      ? (process.env.CLOUDFLARE_ANALYTICS_TOKEN ?? null)
      : null,

  // What comes with every original. Shown in Product details.
  // TODO copy: Cali to confirm each promise before launch.
  originalPromises: [
    'Signed by me',
    'Certificate of authenticity',
    'Insured, tracked delivery, packed by me',
  ],

  // Ways to spread the cost, shown in the Collector note. Leave off until they're real:
  // instalments needs a payment method that offers them at Stripe Checkout (e.g. Klarna,
  // switched on in the Stripe dashboard); Own Art needs Cali registered with the Arts Council scheme.
  payments: {
    instalments: false,
    ownArt: false,
  },

  // Delivery, chosen in the basket. The buyer picks UK or the rest of the world; Stripe then
  // only accepts addresses in those countries and adds the price. Amounts in pounds.
  delivery: settings.delivery.map((d) => ({
    id: d.id,
    label: d.label,
    amount: Number(d.price),
    description: d.description,
    countries: COUNTRIES[d.id] ?? ['GB'],
  })),
  // The delivery line on product pages.
  printsDelivery: settings.printsDelivery,
  originalsDelivery: settings.originalsDelivery,
};
