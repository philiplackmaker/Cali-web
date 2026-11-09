// The shop's catalogue and site photos, as pages see them.
// With SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN set (see .env.example), it's fetched
// live from the Storefront API at build time. Without them, or with SHOPIFY_MOCK=1, it uses
// the mock catalogue in mock.js, which has the same shape.
// TODO copy: collection intros.
import mock from './mock.js';
import { storefrontRequest, QUERIES, normaliseSitePhotos } from '../scripts/shopify-client.js';

const PAINTING = {
  url: '/assets/images/mock/calico-painting-{width}.webp',
  width: 694,
  height: 900,
};
const DETAIL = { url: '/assets/images/mock/detail-{width}.webp', width: 520, height: 520 };

// Mock site photos: the same shape normaliseSitePhotos() makes from site_photo metaobjects.
const mockPhotos = {
  homeHero: {
    image: {
      ...PAINTING,
      altText:
        'A painting by Calico Melton: a figure in a blue sun hat and a checked pink and maroon top, holding a single tulip, against a brushy brown ground.',
    },
  },
  aboutPortrait: {
    image: { ...DETAIL, altText: 'Placeholder for a photo of Cali in the studio.' }, // TODO: real portrait
  },
  studio: [
    {
      image: { ...PAINTING, altText: 'Placeholder studio photo.' },
      caption: 'The studio in Bristol',
    }, // TODO
    { image: { ...DETAIL, altText: 'Placeholder studio photo.' }, caption: 'Work in progress' }, // TODO
    { image: { ...PAINTING, altText: 'Placeholder studio photo.' }, caption: 'Paints and brushes' }, // TODO
  ],
};

async function fetchProducts(config) {
  const products = [];
  let after = null;
  do {
    const { products: page } = await storefrontRequest(config, QUERIES.products, { after });
    products.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return products;
}

async function load() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token || process.env.SHOPIFY_MOCK === '1') {
    console.log(
      '[shop] Using mock catalogue (set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN for live data).',
    );
    return { mode: 'mock', domain: null, token: null, products: mock.products, photos: mockPhotos };
  }
  const config = { domain, token };
  const [products, photoData] = await Promise.all([
    fetchProducts(config),
    storefrontRequest(config, QUERIES.sitePhotos),
  ]);
  const photos = normaliseSitePhotos(photoData.metaobjects.nodes);
  // Until Cali adds site photos in Shopify, fall back to the newest painting.
  const fallback = products.find((p) => p.featuredImage)?.featuredImage;
  photos.homeHero ??= fallback ? { image: fallback } : mockPhotos.homeHero;
  photos.aboutPortrait ??= mockPhotos.aboutPortrait;
  if (!photos.studio.length) photos.studio = mockPhotos.studio;
  console.log(`[shop] Fetched ${products.length} products from ${domain}.`);
  return { mode: 'storefront', domain, token, products, photos };
}

// Fetch once per build (and once per dev-server run; restart to refetch).
let cached;

export default async function () {
  cached ??= load();
  const { mode, domain, token, products, photos } = await cached;
  const originals = products.filter((p) => p.tags.includes('original'));
  const prints = products.filter((p) => p.tags.includes('print'));
  const collections = [
    {
      handle: 'all',
      title: 'All work',
      url: '/shop/',
      intro: 'Original paintings and signed prints, all made in my studio in Bristol.',
      products,
    },
    {
      handle: 'originals',
      title: 'Originals',
      url: '/shop/originals/',
      intro: 'One-off paintings in oil and gouache. Each is the only one there is.',
      products: originals,
    },
    {
      handle: 'prints',
      title: 'Prints',
      url: '/shop/prints/',
      intro: 'Giclée prints in small editions, each signed and numbered by me.',
      products: prints,
    },
  ];
  return {
    mode,
    domain,
    token,
    products,
    byHandle: Object.fromEntries(products.map((p) => [p.handle, p])),
    collections,
    // Newest first (Shopify returns products by createdAt, newest first).
    latest: products.filter((p) => p.availableForSale).slice(0, 6),
    photos,
    // Shopify-hosted policy pages (Online Store policies), linked from /info/.
    policiesUrl: `https://${domain ?? 'calicomelton.myshopify.com'}/policies`,
  };
}
