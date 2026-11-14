import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { productFromEntry, loadContent, slug } from '../../scripts/content.js';

const IMG = (n = 1) => ({
  id: `image/x/${n}`,
  url: `/assets/images/art/x-${n}-{width}.webp`,
  width: 1440,
  height: 1800,
  altText: `Photo ${n}`,
});
const fakeResolve = async (path, name) =>
  path.includes('missing')
    ? null
    : { url: `/assets/images/art/${name}-{width}.webp`, width: 1440, height: 1800 };

const PRINT = {
  title: 'Blue Tulips',
  type: 'Print',
  published: true,
  added: '2026-11-09T12:00',
  description: 'Giclee print.\n\nOn 300gsm paper.',
  made: 'Scanned with no retouching.',
  medium: 'Giclée print',
  options: [
    { size: '20 × 25 cm', price: 30, sold: false },
    { size: '40 × 50 cm', price: 60, sold: true },
  ],
  images: [{ image: '/content/uploads/blue-tulips.jpg', alt: 'Blue tulips in a red pot.' }],
};

test('slug makes safe handles', () => {
  assert.equal(slug('Sun Hat & Tulip, Café'), 'sun-hat-and-tulip-cafe');
});

test('a print: a variant per size, sold sizes unavailable, paragraphs kept', () => {
  const p = productFromEntry('blue-tulips', PRINT, [IMG()]);
  assert.deepEqual(p.tags, ['print']);
  assert.deepEqual(
    p.variants.nodes.map((v) => [v.id, v.title, v.price.amount, v.availableForSale]),
    [
      ['blue-tulips/20-25-cm', '20 × 25 cm', '30.0', true],
      ['blue-tulips/40-50-cm', '40 × 50 cm', '60.0', false],
    ],
  );
  assert.equal(p.availableForSale, true);
  assert.equal(p.priceRange.maxVariantPrice.amount, '60.0');
  assert.equal(
    p.descriptionHtml,
    '<p>Giclee print.</p><p>On 300gsm paper.</p><p>Scanned with no retouching.</p>',
  );
  assert.equal(p.medium.value, 'Giclée print');
  assert.equal(p.dimensions, null);
});

test('an original: one variant, its size as dimensions, sold means sold', () => {
  const entry = {
    title: 'Pink Check',
    type: 'Original',
    options: [{ size: '30 × 40 cm', price: 480, sold: true }],
    medium: 'Oil on board',
    year: '2026',
  };
  const p = productFromEntry('pink-check', entry, [IMG()]);
  assert.deepEqual(p.tags, ['original']);
  assert.equal(p.variants.nodes[0].id, 'pink-check/original');
  assert.equal(p.variants.nodes[0].title, 'Default Title');
  assert.equal(p.dimensions.value, '30 × 40 cm');
  assert.equal(p.year.value, '2026');
  assert.equal(p.availableForSale, false);
});

test('the whole-piece Sold switch sells out every size', () => {
  const p = productFromEntry('blue-tulips', { ...PRINT, sold: true }, [IMG()]);
  assert.deepEqual(
    p.variants.nodes.map((v) => v.availableForSale),
    [false, false],
  );
  assert.equal(p.availableForSale, false);
});

test('price on request needs no price; hidden, photo-less and price-less entries are skipped', () => {
  const warnings = [];
  const warn = (m) => warnings.push(m);
  const onRequest = productFromEntry(
    'big',
    { title: 'Big', type: 'Original', priceOnRequest: true, options: [{ size: '1 × 1 m' }] },
    [IMG()],
    { warn },
  );
  assert.deepEqual(onRequest.tags, ['original', 'price-on-request']);
  assert.equal(productFromEntry('h', { ...PRINT, published: false }, [IMG()], { warn }), null);
  assert.equal(productFromEntry('n', PRINT, [], { warn }), null);
  assert.equal(
    productFromEntry('p', { ...PRINT, options: [{ size: 'A4' }] }, [IMG()], { warn }),
    null,
  );
  assert.equal(warnings.length, 2);
});

test('loadContent: newest first, photos resolved, site photos read', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cali-content-'));
  await mkdir(join(dir, 'products'));
  await writeFile(
    join(dir, 'products', 'older.json'),
    JSON.stringify({ ...PRINT, title: 'Older', added: '2026-01-01T10:00' }),
  );
  await writeFile(
    join(dir, 'products', 'newer.json'),
    JSON.stringify({
      ...PRINT,
      title: 'Newer',
      added: '2026-11-01T10:00',
      images: [...PRINT.images, { image: '/content/uploads/missing.jpg', alt: 'Gone' }],
    }),
  );
  await writeFile(
    join(dir, 'photos.json'),
    JSON.stringify({
      homeHero: { image: '/content/uploads/hero.jpg', alt: 'Hero' },
      aboutPortrait: null,
      studio: [
        { image: '/content/uploads/missing.jpg', alt: 'Gone', caption: 'Lost' },
        { image: '/content/uploads/s.jpg', alt: 'Studio', caption: 'The studio' },
      ],
    }),
  );
  const { products, photos } = await loadContent({ dir, resolveImage: fakeResolve, warn() {} });
  assert.deepEqual(
    products.map((p) => p.handle),
    ['newer', 'older'],
  );
  assert.equal(products[0].images.nodes.length, 1);
  assert.equal(products[0].featuredImage.altText, 'Blue tulips in a red pot.');
  assert.equal(photos.homeHero.image.altText, 'Hero');
  assert.equal(photos.aboutPortrait, null);
  assert.deepEqual(
    photos.studio.map((s) => [s.caption, s.image.altText]),
    [['The studio', 'Studio']],
  );
});

test('clips: MP4s found and labelled; wrong types, missing files and big files warned about', async () => {
  const { clipFor } = await import('../../scripts/content.js');
  const dir = await mkdtemp(join(tmpdir(), 'cali-clips-'));
  await mkdir(join(dir, 'content', 'uploads'), { recursive: true });
  await writeFile(join(dir, 'content', 'uploads', 'brush.mp4'), Buffer.alloc(1024));
  await writeFile(join(dir, 'content', 'uploads', 'big.mp4'), Buffer.alloc(16 * 1024 * 1024));
  const warnings = [];
  const opts = { root: dir, warn: (m) => warnings.push(m) };
  assert.deepEqual(await clipFor('/content/uploads/brush.mp4', 'A brush at work.', opts), {
    url: '/content/uploads/brush.mp4',
    type: 'video/mp4',
    label: 'A brush at work.',
  });
  assert.equal(await clipFor(undefined, 'x', opts), null);
  assert.equal(await clipFor('/content/uploads/clip.mov', 'x', opts), null);
  assert.equal(await clipFor('/content/uploads/gone.mp4', 'x', opts), null);
  assert.ok(await clipFor('/content/uploads/big.mp4', 'x', opts));
  assert.deepEqual(
    warnings.map((w) => w.match(/MP4|find|15 MB/)[0]),
    ['MP4', 'find', '15 MB'],
  );
});
