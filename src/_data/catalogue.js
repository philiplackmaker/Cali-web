// Cali's real prints, from PIP's artwork sheet (9 Nov 2026), shaped like Storefront API
// responses. Used for the preview build until Shopify is connected; after that, Shopify
// is the source of truth and these same details are entered there (see LAUNCH.md).
// Images are web-sized copies of the Dropbox scans in /assets/images/art/.
// mock.js stays as the test and design-system fixture, with its edge cases (sold, sale…).

const gbp = (amount) => ({ amount: Number(amount).toFixed(1), currencyCode: 'GBP' });

const MEDIUM = 'Giclée print on 300gsm prestige paper';
const DESCRIPTION =
  '<p>A museum-quality giclée print on 300gsm prestige paper.</p>' +
  '<p>Each print is scanned from the original hand-painted work, with no digital retouching, then professionally printed on beautiful prestige paper.</p>';

let n = 0;
const image = (name, width, height, altText) => ({
  id: `gid://shopify/ProductImage/art-${++n}`,
  url: `/assets/images/art/${name}-{width}.webp`,
  width,
  height,
  altText,
});

function print({ id, handle, title, sizes, images }) {
  const variants = sizes.map(([size, price], i) => ({
    id: `gid://shopify/ProductVariant/${id}${i + 1}`,
    title: size,
    availableForSale: true,
    quantityAvailable: 20,
    price: gbp(price),
    compareAtPrice: null,
    selectedOptions: [{ name: 'Size', value: size }],
    image: images[0],
  }));
  const amounts = sizes.map(([, price]) => price);
  return {
    id: `gid://shopify/Product/${id}`,
    handle,
    title,
    tags: ['print'],
    availableForSale: true,
    description: `${title}. ${MEDIUM}.`,
    descriptionHtml: DESCRIPTION,
    featuredImage: images[0],
    images: { nodes: images },
    priceRange: {
      minVariantPrice: gbp(Math.min(...amounts)),
      maxVariantPrice: gbp(Math.max(...amounts)),
    },
    compareAtPriceRange: { minVariantPrice: gbp(0), maxVariantPrice: gbp(0) },
    options: [{ name: 'Size', optionValues: sizes.map(([name]) => ({ name })) }],
    variants: { nodes: variants },
    medium: { value: MEDIUM },
    dimensions: null,
    year: null,
    editionSize: null,
    framing: null,
  };
}

const products = [
  print({
    id: 301,
    handle: 'blue-tulips',
    title: 'Blue Tulips',
    sizes: [
      ['20 × 25 cm', 30],
      ['40 × 50 cm', 60],
    ],
    images: [
      image(
        'blue-tulips',
        1440,
        1866,
        'Blue Tulips by Calico Melton: a dark green stem curling up from a small red pot, hung with deep blue tulip heads, on a pale pink ground above a brown table.',
      ),
      image(
        'blue-tulips-alt',
        1440,
        1920,
        'Blue Tulips framed on a wooden sideboard, beside books and a pink lamp.',
      ),
    ],
  }),
  print({
    id: 302,
    handle: 'daisies',
    title: 'Daisies',
    sizes: [
      ['20 × 25 cm', 30],
      ['40 × 50 cm', 60],
    ],
    images: [
      image(
        'daisies',
        1440,
        1860,
        'Daisies by Calico Melton: a branching stem of white daisies in a red and white checked pot, against a deep green ground.',
      ),
    ],
  }),
  print({
    id: 303,
    handle: 'swan',
    title: 'Swan',
    sizes: [
      ['A4', 24],
      ['A3', 30],
    ],
    images: [
      image(
        'swan',
        1440,
        2022,
        'Swan by Calico Melton: a white swan holding a red tulip in its beak, among a sunflower, lily pad, blue flowers and a red heart on a pink ground.',
      ),
    ],
  }),
  print({
    id: 304,
    handle: 'tall-vase',
    title: 'Tall Vase',
    sizes: [
      ['20 × 25 cm', 30],
      ['40 × 50 cm', 60],
    ],
    images: [
      image(
        'tall-vase',
        1440,
        1821,
        'Tall Vase by Calico Melton: a white vase with red squiggles, overflowing with orange, red and yellow flowers and dark green leaves, on a pink ground.',
      ),
      image(
        'tall-vase-alt',
        1440,
        1920,
        'Tall Vase framed on a windowsill, beside a candle and a basket.',
      ),
    ],
  }),
  print({
    id: 305,
    handle: 'vase',
    title: 'Vase',
    sizes: [
      ['20 × 25 cm', 30],
      ['40 × 50 cm', 60],
    ],
    images: [
      image(
        'vase',
        1440,
        1801,
        'Vase by Calico Melton: red and orange flowers and green leaves spilling from a white vase painted with brown squiggles, on a pink ground.',
      ),
    ],
  }),
  print({
    id: 306,
    handle: 'bird',
    title: 'Bird',
    sizes: [
      ['20 × 20 cm', 25],
      ['40 × 40 cm', 50],
    ],
    images: [
      image(
        'bird',
        1440,
        1450,
        'Bird by Calico Melton: a pale pink bird with outstretched wings and a rosy cheek, against a dark brown ground.',
      ),
    ],
  }),
  print({
    id: 307,
    handle: 'monstera',
    title: 'Monstera',
    sizes: [
      ['20 × 20 cm', 25],
      ['40 × 40 cm', 50],
    ],
    images: [
      image(
        'monstera',
        1440,
        1436,
        'Monstera by Calico Melton: a plant with three heart-shaped green leaves arching out of a brown squiggle-patterned pot, on a pale pink and grey ground.',
      ),
    ],
  }),
  print({
    id: 308,
    handle: 'sunflowers',
    title: 'Sunflowers',
    sizes: [
      ['20 × 20 cm', 25],
      ['40 × 40 cm', 50],
    ],
    images: [
      image(
        'sunflowers',
        1440,
        1436,
        'Sunflowers by Calico Melton: three sunflowers standing in a blue and red checked bowl, on a pale pink ground.',
      ),
    ],
  }),
];

// Photos of framed prints at home, for the studio band until Cali adds site photos.
const roomPhotos = [
  { image: products[0].images.nodes[1], caption: 'Blue Tulips at home' },
  { image: products[3].images.nodes[1], caption: 'Tall Vase on the windowsill' },
];

// One default export only: Eleventy exposes a data file's whole module when it has named exports.
export default { products, roomPhotos };
