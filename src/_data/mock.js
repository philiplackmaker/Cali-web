// Mock catalogue shaped like Storefront API responses (products query with
// metafield aliases). Used by components and docs until step 4 swaps in live data.
// Titles and copy are placeholders. <!-- TODO copy -->

const gbp = (amount) => ({ amount: Number(amount).toFixed(1), currencyCode: 'GBP' });
const PAINTING = {
  url: '/assets/images/mock/calico-painting-{width}.webp',
  width: 694,
  height: 900,
};
const DETAIL = { url: '/assets/images/mock/detail-{width}.webp', width: 520, height: 520 };

let n = 0;
const image = (base, altText) => ({ id: `gid://shopify/ProductImage/${++n}`, ...base, altText });

function original({
  id,
  handle,
  title,
  price,
  medium,
  dimensions,
  year,
  sold = false,
  alt,
  framing = null,
  onRequest = false,
}) {
  const images = [image(PAINTING, alt), image(DETAIL, `Detail of ${title}: brushwork close up.`)];
  const variant = {
    id: `gid://shopify/ProductVariant/${id}1`,
    title: 'Default Title',
    availableForSale: !sold,
    quantityAvailable: sold ? 0 : 1,
    price: gbp(price),
    compareAtPrice: null,
    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
    image: images[0],
  };
  return {
    id: `gid://shopify/Product/${id}`,
    handle,
    title,
    tags: onRequest ? ['original', 'price-on-request'] : ['original'],
    availableForSale: !sold,
    description: `${title}. ${medium}, ${dimensions}, ${year}.`,
    descriptionHtml: `<p>A placeholder description in my voice: where this one came from, and what I was looking at. <!-- TODO copy --></p>`,
    featuredImage: images[0],
    images: { nodes: images },
    priceRange: { minVariantPrice: gbp(price), maxVariantPrice: gbp(price) },
    compareAtPriceRange: { minVariantPrice: gbp(0), maxVariantPrice: gbp(0) },
    options: [{ name: 'Title', optionValues: [{ name: 'Default Title' }] }],
    variants: { nodes: [variant] },
    medium: { value: medium },
    dimensions: { value: dimensions },
    year: { value: String(year) },
    editionSize: null,
    framing: framing ? { value: framing } : null,
  };
}

function print({
  id,
  handle,
  title,
  sizes,
  papers,
  edition,
  alt,
  soldOut = [],
  sale = 0,
  allSold = false,
}) {
  const images = [
    image(PAINTING, alt),
    image(DETAIL, `Detail of ${title}: paper texture close up.`),
  ];
  const variants = [];
  for (const [size, base] of sizes) {
    for (const [paper, extra] of papers) {
      const key = `${size} / ${paper}`;
      const available = !allSold && !soldOut.includes(key);
      const price = base + extra;
      variants.push({
        id: `gid://shopify/ProductVariant/${id}${variants.length + 1}`,
        title: key,
        availableForSale: available,
        quantityAvailable: available ? 20 : 0,
        price: gbp(price - sale),
        compareAtPrice: sale ? gbp(price) : null,
        selectedOptions: [
          { name: 'Size', value: size },
          { name: 'Paper', value: paper },
        ],
        image: paper === papers[0][0] ? images[0] : images[1],
      });
    }
  }
  const amounts = variants.map((v) => Number(v.price.amount));
  return {
    id: `gid://shopify/Product/${id}`,
    handle,
    title,
    tags: ['print'],
    availableForSale: variants.some((v) => v.availableForSale),
    description: `${title}. Giclée print, edition of ${edition}.`,
    descriptionHtml: `<p>Printed in Bristol on archival paper, signed and numbered by me. <!-- TODO copy --></p>`,
    featuredImage: images[0],
    images: { nodes: images },
    priceRange: {
      minVariantPrice: gbp(Math.min(...amounts)),
      maxVariantPrice: gbp(Math.max(...amounts)),
    },
    compareAtPriceRange: sale
      ? {
          minVariantPrice: gbp(Math.min(...amounts) + sale),
          maxVariantPrice: gbp(Math.max(...amounts) + sale),
        }
      : { minVariantPrice: gbp(0), maxVariantPrice: gbp(0) },
    options: [
      { name: 'Size', optionValues: sizes.map(([name]) => ({ name })) },
      { name: 'Paper', optionValues: papers.map(([name]) => ({ name })) },
    ],
    variants: { nodes: variants },
    medium: { value: 'Giclée print' },
    dimensions: null,
    year: null,
    editionSize: { value: String(edition) },
    framing: { value: 'Unframed, posted flat' },
  };
}

const ALT =
  'A painting of a figure in a blue sun hat and checkered pink and maroon top, holding a single tulip, against a brushy brown background.';

const products = [
  original({
    id: 101,
    handle: 'sun-hat-with-tulip',
    title: 'Sun Hat with Tulip',
    price: 950,
    medium: 'Oil on canvas',
    dimensions: '60 × 80 cm',
    year: 2026,
    framing: 'Oak tray frame, ready to hang',
    alt: ALT,
  }),
  original({
    id: 102,
    handle: 'pink-check',
    title: 'Pink Check',
    price: 480,
    medium: 'Oil on board',
    dimensions: '30 × 40 cm',
    year: 2026,
    alt: ALT,
  }),
  original({
    id: 103,
    handle: 'afternoon-montpelier',
    title: 'Afternoon, Montpelier',
    price: 720,
    medium: 'Oil on canvas',
    dimensions: '50 × 60 cm',
    year: 2025,
    sold: true,
    alt: ALT,
  }),
  original({
    id: 104,
    handle: 'blue-jug',
    title: 'Blue Jug',
    price: 260,
    medium: 'Gouache on paper',
    dimensions: '21 × 30 cm',
    year: 2026,
    alt: ALT,
  }),
  original({
    id: 105,
    handle: 'large-interior-redland',
    title: 'Large Interior, Redland',
    price: 3800,
    medium: 'Oil on linen',
    dimensions: '120 × 150 cm',
    year: 2026,
    framing: 'Unframed, stretched and ready to hang',
    onRequest: true,
    alt: ALT,
  }),
  print({
    id: 201,
    handle: 'sun-hat-with-tulip-print',
    title: 'Sun Hat with Tulip, print',
    edition: 50,
    alt: ALT,
    sizes: [
      ['A4', 45],
      ['A3', 75],
      ['A2', 120],
    ],
    papers: [
      ['Smooth matte', 0],
      ['Cotton rag', 10],
    ],
    soldOut: ['A2 / Cotton rag'],
  }),
  print({
    id: 202,
    handle: 'pink-check-print',
    title: 'Pink Check, print',
    edition: 25,
    alt: ALT,
    sale: 10,
    sizes: [
      ['A4', 45],
      ['A3', 75],
    ],
    papers: [['Cotton rag', 0]],
  }),
  print({
    id: 203,
    handle: 'small-tulip-print',
    title: 'Small Tulip, print',
    edition: 100,
    alt: ALT,
    sizes: [['A5', 25]],
    papers: [['Smooth matte', 0]],
  }),
  print({
    id: 204,
    handle: 'blue-jug-print',
    title: 'Blue Jug, print',
    edition: 30,
    alt: ALT,
    allSold: true,
    sizes: [['A4', 45]],
    papers: [['Cotton rag', 0]],
  }),
];

export default {
  products,
  byHandle: Object.fromEntries(products.map((p) => [p.handle, p])),
  collections: {
    originals: products.filter((p) => p.tags.includes('original')),
    prints: products.filter((p) => p.tags.includes('print')),
  },
};
