// The shop's catalogue and site photos, as pages see them (global data `shop`, registered in
// eleventy.config.js because the sheet's images are written into the output folder).
//
// Where products come from:
//   SHEET_CSV_URL set     → Cali's Google Sheet (scripts/sheet.js). The live site uses this.
//   SHOP_FIXTURE=mock     → src/_data/mock.js: test products with every edge case (e2e tests).
//   neither               → scripts/local-catalogue.js, a copy of the sheet (development).
// Payments go through Stripe Checkout (netlify/functions/checkout.mjs) in every case.
import mock from '../src/_data/mock.js';
import { rows as localRows, resolveLocalImage } from './local-catalogue.js';
import { loadSheet, productsFromRows, csvUrlFor } from './sheet.js';

const PLACEHOLDER = { url: '/assets/images/mock/detail-{width}.webp', width: 520, height: 520 };

async function loadProducts({ outputDir }) {
  if (process.env.SHOP_FIXTURE === 'mock') {
    return { source: 'fixture', products: mock.products, photos: null };
  }
  if (process.env.SHEET_CSV_URL) {
    const { products, photos } = await loadSheet({
      csvUrl: csvUrlFor(process.env.SHEET_CSV_URL),
      photosCsvUrl: process.env.SHEET_PHOTOS_CSV_URL
        ? csvUrlFor(process.env.SHEET_PHOTOS_CSV_URL)
        : null,
      outputDir,
    });
    console.log(`[shop] ${products.length} products from the Google Sheet.`);
    return { source: 'sheet', products, photos };
  }
  console.log('[shop] Using the local copy of the artwork sheet (set SHEET_CSV_URL for live).');
  const products = await productsFromRows(localRows, {
    resolveImage: async (link) => resolveLocalImage(link),
  });
  return { source: 'local', products, photos: null };
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
    // "sheet" on the live site; check:launch fails on anything else.
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
