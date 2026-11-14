// The shop's catalogue and site photos, as pages see them (global data `shop`, registered in
// eleventy.config.js because product photos are resized into the output folder).
//
// Where products come from:
//   content/                → what Cali edits at /admin/ (scripts/content.js). Always, except:
//   SHOP_FIXTURE=mock       → src/_data/mock.js: test products with every edge case (e2e tests).
// Payments go through Stripe Checkout (netlify/functions/checkout.mjs) in every case.
import mock from '../src/_data/mock.js';
import { loadContent } from './content.js';

const PLACEHOLDER = { url: '/assets/images/mock/detail-{width}.webp', width: 520, height: 520 };

async function loadProducts({ outputDir }) {
  if (process.env.SHOP_FIXTURE === 'mock') {
    return { source: 'fixture', products: mock.products, photos: null };
  }
  const { products, photos } = await loadContent({ outputDir });
  console.log(`[shop] ${products.length} products from content/ (edited at /admin/).`);
  return { source: 'content', products, photos };
}

/** Fills any photo the sheet's Photos tab doesn't set, from the paintings themselves. */
function withFallbackPhotos(photos, products) {
  const paintings = products.filter((p) => p.featuredImage);
  const extraViews = paintings
    .filter((p) => p.images.nodes.length > 1)
    .map((p) => ({ image: p.images.nodes[1], caption: p.title }));
  const studio = photos?.studio?.length
    ? photos.studio
    : [...extraViews, ...paintings.map((p) => ({ image: p.featuredImage, caption: p.title }))]
        .filter((photo, i, all) => all.findIndex((x) => x.image.url === photo.image.url) === i)
        .slice(0, 3);
  return {
    homeHero: photos?.homeHero ?? (paintings[0] ? { image: paintings[0].featuredImage } : null),
    // The Commissions page photo: none means the form runs full width.
    contact: photos?.contact ?? null,
    aboutPortrait: photos?.aboutPortrait ?? {
      image: { ...PLACEHOLDER, altText: 'Placeholder for a photo of Cali in the studio.' }, // TODO: real portrait
    },
    studio,
  };
}

export async function loadShop({ outputDir = '_site' } = {}) {
  const { source, products, photos } = await loadProducts({ outputDir });
  const originals = products.filter((p) => p.tags.includes('original'));
  const prints = products.filter((p) => p.tags.includes('print'));
  const collections = [
    {
      handle: 'all',
      title: 'All work',
      url: '/shop/',
      intro: originals.length
        ? 'Original paintings and prints, all made in my studio in Bristol.'
        : 'Prints of my paintings, all made in my studio in Bristol.',
      products,
    },
    {
      handle: 'originals',
      title: 'Originals',
      url: '/shop/originals/',
      intro: 'One-off paintings. Each is the only one there is.',
      products: originals,
    },
    {
      handle: 'prints',
      title: 'Prints',
      url: '/shop/prints/',
      intro:
        'Giclée prints of my paintings, scanned with no digital retouching and printed on 300gsm prestige paper.',
      products: prints,
    },
  ];
  return {
    // "content" on the live site; check:launch fails on the test fixture.
    source,
    products,
    byHandle: Object.fromEntries(products.map((p) => [p.handle, p])),
    collections,
    // No originals for sale yet: pages link to prints instead of an empty Originals page.
    hasOriginals: originals.length > 0,
    // The sheet's order: newest first.
    latest: products.filter((p) => p.availableForSale).slice(0, 6),
    photos: withFallbackPhotos(photos, products),
  };
}
