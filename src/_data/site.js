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
  // TODO: Cali to set the real prices and times before launch.
  delivery: [
    {
      id: 'uk',
      label: 'UK',
      amount: 4,
      description: 'Royal Mail tracked, 2 to 5 working days',
      countries: ['GB'],
    },
    {
      id: 'world',
      label: 'Rest of the world',
      amount: 12,
      description: 'Tracked international, 5 to 15 working days',
      countries: 'world',
    },
  ],
};
