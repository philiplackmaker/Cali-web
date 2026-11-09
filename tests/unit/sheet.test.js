import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsv,
  sheetRows,
  productsFromRows,
  photosFromRows,
  normaliseSize,
  parsePrice,
  csvUrlFor,
  directImageUrl,
  loadSheet,
} from '../../scripts/sheet.js';

const fakeImage = async (link, { handle, index }) =>
  link.includes('broken')
    ? null
    : { url: `/assets/images/art/${handle}-${index}-{width}.webp`, width: 1440, height: 1800 };

// The real sheet's layout: a note in the Dropbox header, a blank row, rows per size.
const CSV = `Name,Description,Cost,Size,How it was made,Dropbox - https://www.dropbox.com/home/Cali%20Website,alternative images
,,,,,,
Blue Tulips,"Giclee, museum quality print on 300gsm, beautiful prestige paper",£30,20cm x 25cm,Scanned with no retouching.,https://www.dropbox.com/scl/fi/a/Blue-Tulips.jpg?dl=0,https://www.dropbox.com/scl/fi/b/blue-tulips.jpg?dl=0
Blue Tulips,"Giclee, museum quality print on 300gsm, beautiful prestige paper",£60,40cm x 50cm,Scanned with no retouching.,https://www.dropbox.com/scl/fi/a/Blue-Tulips.jpg?dl=0,
Tall Vase,Giclee print,£30,20cm x 25cm,x,https://www.dropbox.com/scl/fi/c/tall-vase.jpg?dl=0,
Tall vase,Giclee print,£60,40cm x 50cm,x,https://www.dropbox.com/scl/fi/c/tall-vase.jpg?dl=0,
`;

test('parseCsv handles quotes, escaped quotes, commas and newlines', () => {
  assert.deepEqual(parseCsv('a,"b, c","say ""hi""","line\nbreak"\r\nx,y\n'), [
    ['a', 'b, c', 'say "hi"', 'line\nbreak'],
    ['x', 'y'],
  ]);
});

test('sheetRows maps headers to keys and skips blank rows', () => {
  const rows = sheetRows(CSV);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].name, 'Blue Tulips');
  assert.equal(rows[0].price, '£30');
  assert.match(rows[0].image, /Blue-Tulips\.jpg/);
  assert.match(rows[0].moreImages, /blue-tulips\.jpg/);
});

test('sizes and prices are read the way Cali writes them', () => {
  assert.equal(normaliseSize('20cm x 25cm'), '20 × 25 cm');
  assert.equal(normaliseSize('40 x 50cm'), '40 × 50 cm');
  assert.equal(normaliseSize('A4'), 'A4');
  assert.equal(parsePrice('£30'), 30);
  assert.equal(parsePrice('£1,200'), 1200);
  assert.equal(parsePrice('Price on request'), 'on-request');
  assert.equal(parsePrice('tbc'), null);
});

test('rows become products: one per name (any case), a variant per size', async () => {
  const products = await productsFromRows(sheetRows(CSV), { resolveImage: fakeImage });
  assert.deepEqual(
    products.map((p) => p.handle),
    ['blue-tulips', 'tall-vase'],
  );
  const [tulips, vase] = products;
  assert.equal(vase.title, 'Tall Vase');
  assert.deepEqual(tulips.tags, ['print']);
  assert.equal(tulips.medium.value, 'Giclée print');
  assert.deepEqual(
    tulips.variants.nodes.map((v) => [v.id, v.title, v.price.amount]),
    [
      ['blue-tulips/20-25-cm', '20 × 25 cm', '30.0'],
      ['blue-tulips/40-50-cm', '40 × 50 cm', '60.0'],
    ],
  );
  assert.equal(tulips.priceRange.minVariantPrice.amount, '30.0');
  assert.equal(tulips.images.nodes.length, 2);
  assert.equal(tulips.featuredImage.altText, 'Blue Tulips, a painting by Calico Melton.');
  assert.equal(tulips.images.nodes[1].altText, 'Blue Tulips: another view.');
  assert.match(tulips.descriptionHtml, /^<p>Giclee, museum quality/);
});

test('optional columns: originals, sold, price on request, alt text', async () => {
  const rows = [
    {
      name: 'Pink Check',
      type: 'Original',
      price: '£480',
      size: '30cm x 40cm',
      medium: 'Oil on board',
      year: '2026',
      image: 'https://x/pink.jpg',
      alt: 'A pink check painting.',
    },
    { name: 'Gone', type: 'original', price: '£300', sold: 'yes', image: 'https://x/gone.jpg' },
    { name: 'Big One', type: 'Original', price: 'On request', image: 'https://x/big.jpg' },
    { name: 'Swan', price: '£24', size: 'A4', image: 'https://x/swan.jpg', sold: 'Sold' },
    { name: 'Swan', price: '£30', size: 'A3', image: 'https://x/swan.jpg' },
  ];
  const products = await productsFromRows(rows, { resolveImage: fakeImage });
  const [pink, gone, big, swan] = products;
  assert.deepEqual(pink.tags, ['original']);
  assert.equal(pink.variants.nodes[0].title, 'Default Title');
  assert.equal(pink.variants.nodes[0].quantityAvailable, 1);
  assert.equal(pink.dimensions.value, '30 × 40 cm');
  assert.equal(pink.featuredImage.altText, 'A pink check painting.');
  assert.equal(gone.availableForSale, false);
  assert.deepEqual(big.tags, ['original', 'price-on-request']);
  assert.equal(swan.availableForSale, true);
  assert.deepEqual(
    swan.variants.nodes.map((v) => v.availableForSale),
    [false, true],
  );
});

test('a product with no price or no loadable image is skipped, with a warning', async () => {
  const warnings = [];
  const products = await productsFromRows(
    [
      { name: 'No Price', size: 'A4', image: 'https://x/a.jpg' },
      { name: 'Broken', price: '£20', size: 'A4', image: 'https://x/broken.jpg' },
      { name: 'Fine', price: '£20', size: 'A4', image: 'https://x/fine.jpg' },
    ],
    { resolveImage: fakeImage, warn: (m) => warnings.push(m) },
  );
  assert.deepEqual(
    products.map((p) => p.handle),
    ['fine'],
  );
  assert.equal(warnings.length, 2);
});

test('photos tab: placements and order', async () => {
  const photos = await photosFromRows(
    [
      { placement: 'Studio', image: 'https://x/2.jpg', alt: 'Two', caption: 'Second', order: '2' },
      { placement: 'Home hero', image: 'https://x/h.jpg', alt: 'Hero' },
      { placement: 'Studio', image: 'https://x/1.jpg', alt: 'One', caption: 'First', order: '1' },
      { placement: 'About portrait', image: 'https://x/p.jpg', alt: 'Cali' },
    ],
    { resolveImage: fakeImage },
  );
  assert.equal(photos.homeHero.image.altText, 'Hero');
  assert.equal(photos.aboutPortrait.image.altText, 'Cali');
  assert.deepEqual(
    photos.studio.map((p) => p.caption),
    ['First', 'Second'],
  );
});

test('links: a Google Sheets edit link becomes its CSV export; Dropbox links download', () => {
  assert.equal(
    csvUrlFor('https://docs.google.com/spreadsheets/d/abc_123/edit?gid=0#gid=0'),
    'https://docs.google.com/spreadsheets/d/abc_123/export?format=csv&gid=0',
  );
  assert.equal(
    csvUrlFor('https://docs.google.com/spreadsheets/d/abc/edit#gid=42'),
    'https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=42',
  );
  const published = 'https://docs.google.com/spreadsheets/d/e/2PACX/pub?output=csv';
  assert.equal(csvUrlFor(published), published);
  assert.equal(
    directImageUrl('https://www.dropbox.com/scl/fi/a/x.jpg?rlkey=k&dl=0'),
    'https://www.dropbox.com/scl/fi/a/x.jpg?rlkey=k&dl=1',
  );
});

test('loadSheet explains a private sheet instead of building nothing', async () => {
  const fetch = async () => new Response('<!DOCTYPE html><title>Sign in</title>', { status: 401 });
  await assert.rejects(
    loadSheet({ csvUrl: 'https://sheet.example/csv', fetch, resolveImage: fakeImage }),
    /Anyone with the link/,
  );
});

test('loadSheet reads products and the photos tab', async () => {
  const fetch = async (url) =>
    new Response(
      url.includes('photos') ? 'Placement,Image,Alt text\nHome hero,https://x/h.jpg,Hero\n' : CSV,
    );
  const { products, photos } = await loadSheet({
    csvUrl: 'https://sheet.example/csv',
    photosCsvUrl: 'https://sheet.example/photos',
    fetch,
    resolveImage: fakeImage,
  });
  assert.equal(products.length, 2);
  assert.equal(photos.homeHero.image.altText, 'Hero');
});
