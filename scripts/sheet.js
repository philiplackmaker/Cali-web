// Google Sheet → shop catalogue. Cali keeps the artwork list in a sheet: one row per size
// (or one row for an original), with a Dropbox link to the scan. The build reads the sheet
// as CSV, groups rows into products, and makes web-sized WebP copies of the images.
// The products come out in the shape the rest of the site uses (first designed around
// Shopify's Storefront API), so templates and the cart don't care where they came from.
//
// Columns (header names, any case; extra columns are ignored):
//   Name, Description, Cost, Size, How it was made, Dropbox…, alternative images
// Optional: Type (Print / Original), Sold (yes), Alt text, Medium, Year, Framing, Edition
import Image from '@11ty/eleventy-img';
import { join } from 'node:path';

/** RFC 4180 CSV: quoted fields, "" escapes, commas and newlines inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const COLUMNS = [
  ['name', /^(name|title)$/],
  ['description', /^description$/],
  ['price', /^(cost|price)$/],
  ['size', /^size$/],
  ['made', /^how it was made$/],
  ['image', /^(dropbox|image|photo)/],
  ['moreImages', /^(alternative|alt|more|other) (images|photos)/],
  ['type', /^type$/],
  ['sold', /^sold/],
  ['alt', /^alt text$/],
  ['medium', /^medium$/],
  ['year', /^year$/],
  ['framing', /^framing$/],
  ['edition', /^edition/],
  // Photos tab
  ['placement', /^placement$/],
  ['caption', /^caption$/],
  ['order', /^order$/],
];

/** Header row → keys. Header text after " - " or "(" is a note (e.g. a Dropbox folder link). */
function columnKey(header) {
  const name = header
    .split(/\s+-\s+|\(/)[0]
    .trim()
    .toLowerCase();
  return COLUMNS.find(([, re]) => re.test(name))?.[0] ?? null;
}

/** CSV text → [{ name, price, size, … }], skipping blank rows. */
export function sheetRows(text) {
  const table = parseCsv(text);
  const headerIndex = table.findIndex((r) => r.some((cell) => columnKey(cell)));
  if (headerIndex < 0) return [];
  const keys = table[headerIndex].map(columnKey);
  return table
    .slice(headerIndex + 1)
    .map((cells) => {
      const row = {};
      keys.forEach((key, i) => {
        if (key && cells[i]?.trim()) row[key] = cells[i].trim();
      });
      return row;
    })
    .filter((row) => Object.keys(row).length);
}

export const slug = (s) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** "20cm x 25cm" → "20 × 25 cm". Anything else (A4, 30 x 40 in) is kept as written. */
export function normaliseSize(size = '') {
  const m = size.match(/^(\d+(?:\.\d+)?)\s*(?:cm)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*cm$/i);
  return m ? `${m[1]} × ${m[2]} cm` : size.trim();
}

/** "£30" → 30, "on request" → "on-request", nonsense → null. */
export function parsePrice(text = '') {
  if (/request/i.test(text)) return 'on-request';
  const n = Number(text.replace(/[£,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const truthy = (v) => /^(y|yes|sold|x|true|1)$/i.test(v?.trim() ?? '');
const escapeHtml = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const gbp = (amount) => ({ amount: Number(amount).toFixed(1), currencyCode: 'GBP' });
const imageLinks = (text = '') => text.split(/[\s,]+/).filter((s) => /^https?:\/\//.test(s));

/**
 * Rows → products. resolveImage(url, { handle, index }) returns { url, width, height } with a
 * "{width}" placeholder in the url, or null if the image couldn't be fetched.
 * Products keep the sheet's order (put the newest first).
 */
export async function productsFromRows(rows, { resolveImage, warn = console.warn }) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.name) continue;
    const handle = slug(row.name);
    if (!groups.has(handle)) groups.set(handle, []);
    groups.get(handle).push(row);
  }

  const products = [];
  for (const [handle, group] of groups) {
    const first = group[0];
    const title = first.name;
    const original = group.some((r) => /original/i.test(r.type ?? ''));

    const links = [
      ...new Set(group.flatMap((r) => [...imageLinks(r.image), ...imageLinks(r.moreImages)])),
    ];
    const images = [];
    for (const [i, link] of links.entries()) {
      const image = await resolveImage(link, { handle, index: i + 1 });
      if (!image) continue;
      images.push({
        id: `image/${handle}/${i + 1}`,
        ...image,
        altText: images.length
          ? `${title}: another view.`
          : (first.alt ?? `${title}, a painting by Calico Melton.`),
      });
    }
    if (!images.length) {
      warn(`[sheet] Skipping "${title}": no image could be loaded from its Dropbox link.`);
      continue;
    }

    const onRequest = group.some((r) => parsePrice(r.price) === 'on-request');
    const rowsWithPrice = group.filter((r) => typeof parsePrice(r.price) === 'number');
    if (!onRequest && !rowsWithPrice.length) {
      warn(`[sheet] Skipping "${title}": no price in the Cost column.`);
      continue;
    }

    const variantRows = original ? [rowsWithPrice[0] ?? first] : rowsWithPrice;
    const variants = variantRows.map((r) => {
      const size = original ? 'Default Title' : normaliseSize(r.size) || 'One size';
      const sold = truthy(r.sold);
      const price = parsePrice(r.price);
      return {
        id: `${handle}/${original ? 'original' : slug(size)}`,
        title: size,
        availableForSale: !sold,
        quantityAvailable: sold ? 0 : original ? 1 : 20,
        price: gbp(typeof price === 'number' ? price : 0),
        compareAtPrice: null,
        selectedOptions: [{ name: original ? 'Title' : 'Size', value: size }],
        image: images[0],
      };
    });
    const amounts = variants.map((v) => Number(v.price.amount));
    const optionName = original ? 'Title' : 'Size';
    const paragraphs = [first.description, first.made].filter(Boolean);
    const giclee = /gicl[eé]e/i.test(first.description ?? '');

    products.push({
      id: `product/${handle}`,
      handle,
      title,
      tags: [original ? 'original' : 'print', ...(onRequest ? ['price-on-request'] : [])],
      availableForSale: variants.some((v) => v.availableForSale),
      description: paragraphs.join(' '),
      descriptionHtml: paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(''),
      featuredImage: images[0],
      images: { nodes: images },
      priceRange: {
        minVariantPrice: gbp(Math.min(...amounts)),
        maxVariantPrice: gbp(Math.max(...amounts)),
      },
      compareAtPriceRange: { minVariantPrice: gbp(0), maxVariantPrice: gbp(0) },
      options: [{ name: optionName, optionValues: variants.map((v) => ({ name: v.title })) }],
      variants: { nodes: variants },
      medium: { value: first.medium ?? (original ? null : giclee ? 'Giclée print' : 'Print') },
      dimensions: original && first.size ? { value: normaliseSize(first.size) } : null,
      year: first.year ? { value: first.year } : null,
      editionSize: first.edition ? { value: first.edition } : null,
      framing: first.framing ? { value: first.framing } : null,
    });
  }
  return products;
}

/**
 * Photos tab rows → { homeHero, aboutPortrait, studio[] }, the shape pages use.
 * Placement: "home hero", "about portrait" or "studio"; Order sorts studio photos.
 */
export async function photosFromRows(rows, { resolveImage }) {
  const photos = { homeHero: null, aboutPortrait: null, studio: [] };
  const sorted = [...rows].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  for (const [i, row] of sorted.entries()) {
    const link = imageLinks(row.image)[0];
    const placement = slug(row.placement ?? '');
    if (!link || !placement) continue;
    const image = await resolveImage(link, { handle: `photo-${placement}`, index: i + 1 });
    if (!image) continue;
    const photo = { image: { ...image, altText: row.alt ?? '' }, caption: row.caption ?? null };
    if (placement === 'home-hero') photos.homeHero ??= photo;
    else if (placement === 'about-portrait') photos.aboutPortrait ??= photo;
    else if (placement === 'studio') photos.studio.push(photo);
  }
  return photos;
}

/** Dropbox share links point at a preview page; dl=1 gets the file itself. */
export function directImageUrl(link) {
  const url = new URL(link);
  if (url.hostname.endsWith('dropbox.com')) url.searchParams.set('dl', '1');
  return url.toString();
}

export const IMAGE_WIDTHS = [320, 480, 640, 800, 1080, 1440];

/** Downloads (cached in .cache/) and resizes one image into <outputDir>/assets/images/art/. */
export function imageResolver(outputDir, { warn = console.warn } = {}) {
  return async (link, { handle, index }) => {
    const name = `${handle}-${index}`;
    try {
      const meta = await Image(directImageUrl(link), {
        widths: IMAGE_WIDTHS,
        formats: ['webp'],
        outputDir: join(outputDir, 'assets/images/art'),
        urlPath: '/assets/images/art/',
        filenameFormat: (id, src, width, format) => `${name}-${width}.${format}`,
        cacheOptions: { duration: '1d', directory: '.cache/eleventy-fetch', type: 'buffer' },
        // Some scans are huge (18,000 px wide): let sharp open them.
        sharpOptions: { limitInputPixels: false },
      });
      const largest = meta.webp.at(-1);
      return {
        url: `/assets/images/art/${name}-{width}.webp`,
        width: largest.width,
        height: largest.height,
      };
    } catch (error) {
      warn(`[sheet] Couldn't load the image for ${handle} (${link}): ${error.message}`);
      return null;
    }
  };
}

async function fetchCsv(url, fetchImpl) {
  const res = await fetchImpl(url);
  const text = await res.text();
  if (!res.ok || /^\s*<!doctype html|^\s*<html/i.test(text)) {
    throw new Error(
      `Couldn't read the sheet at ${url} (HTTP ${res.status}). Is it shared as "Anyone with the link" or published to the web as CSV?`,
    );
  }
  return text;
}

/** Reads the products sheet (and the optional photos sheet). Throws if the sheet can't be read. */
export async function loadSheet({
  csvUrl,
  photosCsvUrl,
  outputDir,
  fetch: fetchImpl = globalThis.fetch,
  resolveImage = imageResolver(outputDir),
}) {
  const products = await productsFromRows(sheetRows(await fetchCsv(csvUrl, fetchImpl)), {
    resolveImage,
  });
  const photos = photosCsvUrl
    ? await photosFromRows(sheetRows(await fetchCsv(photosCsvUrl, fetchImpl)), { resolveImage })
    : null;
  return { products, photos };
}

/** A Google Sheets link (…/edit#gid=0) → its CSV export URL. CSV links pass through. */
export function csvUrlFor(link) {
  const m = link.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/);
  if (!m || /output=csv|format=csv/.test(link)) return link;
  const gid = link.match(/[#&?]gid=(\d+)/)?.[1] ?? '0';
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}
