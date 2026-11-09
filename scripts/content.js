// CMS content → shop catalogue. Cali edits products and site photos at /admin/ (Decap CMS,
// config in src/admin/config.yml). Each Publish commits a file to the repo:
//   content/products/<handle>.json   one per print or original
//   content/photos.json               home painting, About photo, studio photos
//   content/uploads/                  the photos and short clips she uploads
// The build turns them into the product shape the rest of the site uses (first designed
// around Shopify's Storefront API), and makes web-sized WebP copies of every photo.
import Image from '@11ty/eleventy-img';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const gbp = (amount) => ({ amount: Number(amount).toFixed(1), currencyCode: 'GBP' });
const escapeHtml = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const slug = (s) =>
  String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Paragraphs from a text field: blank lines split them. */
const paragraphs = (text = '') =>
  String(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * One content entry → a product, or null (unpublished, or nothing to sell). `images` are the
 * entry's photos already resolved to { url, width, height, altText }.
 */
export function productFromEntry(handle, entry, images, { warn = console.warn } = {}) {
  const title = entry.title?.trim();
  if (!title || entry.published === false) return null;
  if (!images.length) {
    warn(`[content] Skipping "${title}": it has no photo.`);
    return null;
  }
  const original = entry.type === 'Original';
  const onRequest = Boolean(entry.priceOnRequest);
  const options = (entry.options ?? []).filter((o) => onRequest || Number(o.price) > 0);
  if (!options.length) {
    warn(`[content] Skipping "${title}": add at least one size with a price.`);
    return null;
  }
  const chosen = original ? options.slice(0, 1) : options;
  const variants = chosen.map((o) => {
    const size = original ? 'Default Title' : o.size?.trim() || 'One size';
    const sold = Boolean(o.sold);
    return {
      id: `${handle}/${original ? 'original' : slug(size)}`,
      title: size,
      availableForSale: !sold,
      quantityAvailable: sold ? 0 : original ? 1 : 20,
      price: gbp(Number(o.price) || 0),
      compareAtPrice: null,
      selectedOptions: [{ name: original ? 'Title' : 'Size', value: size }],
      image: images[0],
    };
  });
  const amounts = variants.map((v) => Number(v.price.amount));
  const text = [...paragraphs(entry.description), ...paragraphs(entry.made)];
  return {
    id: `product/${handle}`,
    handle,
    title,
    tags: [original ? 'original' : 'print', ...(onRequest ? ['price-on-request'] : [])],
    availableForSale: variants.some((v) => v.availableForSale),
    description: text.join(' '),
    descriptionHtml: text.map((p) => `<p>${escapeHtml(p)}</p>`).join(''),
    featuredImage: images[0],
    images: { nodes: images },
    priceRange: {
      minVariantPrice: gbp(Math.min(...amounts)),
      maxVariantPrice: gbp(Math.max(...amounts)),
    },
    compareAtPriceRange: { minVariantPrice: gbp(0), maxVariantPrice: gbp(0) },
    options: [
      {
        name: original ? 'Title' : 'Size',
        optionValues: variants.map((v) => ({ name: v.title })),
      },
    ],
    variants: { nodes: variants },
    medium: entry.medium ? { value: entry.medium } : null,
    dimensions: original && chosen[0].size ? { value: chosen[0].size } : null,
    year: entry.year ? { value: String(entry.year) } : null,
    editionSize: entry.edition ? { value: String(entry.edition) } : null,
    framing: entry.framing ? { value: entry.framing } : null,
  };
}

// Clips play on a silent loop, so keep them short: over this, the build log warns.
export const CLIP_WARN_BYTES = 15 * 1024 * 1024;
const VIDEO_TYPES = { mp4: 'video/mp4', webm: 'video/webm', m4v: 'video/mp4' };

/**
 * An uploaded clip (/content/uploads/x.mp4) → { url, type, label }, or null if there's none
 * or the file is missing. Clips are served as uploaded, from /content/uploads/.
 */
export async function clipFor(path, label, { root = '.', warn = console.warn } = {}) {
  if (!path) return null;
  const type = VIDEO_TYPES[path.split('.').pop().toLowerCase()];
  if (!type) {
    warn(`[content] ${path}: clips need to be MP4 (or WebM) files.`);
    return null;
  }
  try {
    const { size } = await stat(join(root, path.replace(/^\//, '')));
    if (size > CLIP_WARN_BYTES) {
      warn(
        `[content] ${path} is ${Math.round(size / 1048576)} MB: pages load faster with clips under 15 MB.`,
      );
    }
  } catch {
    warn(`[content] Couldn't find the clip ${path}.`);
    return null;
  }
  return { url: path, type, label: label || null };
}

export const IMAGE_WIDTHS = [320, 480, 640, 800, 1080, 1440];

/**
 * Resizes an uploaded photo (/content/uploads/x.jpg) into <outputDir>/assets/images/art/.
 * Returns { url, width, height } with a "{width}" placeholder, or null if it can't be read.
 */
export function imageResolver(outputDir, { root = '.', warn = console.warn } = {}) {
  return async (path, name) => {
    try {
      const meta = await Image(join(root, path.replace(/^\//, '')), {
        widths: IMAGE_WIDTHS,
        formats: ['webp'],
        outputDir: join(outputDir, 'assets/images/art'),
        urlPath: '/assets/images/art/',
        filenameFormat: (id, src, width, format) => `${name}-${width}.${format}`,
        // Paintings compress well: quality 72 looks the same and keeps mobile LCP under 2.5 s.
        sharpWebpOptions: { quality: 72, effort: 6, smartSubsample: true },
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
      warn(`[content] Couldn't read the photo ${path}: ${error.message}`);
      return null;
    }
  };
}

async function resolveAll(list, prefix, resolveImage, fallbackAlt) {
  const images = [];
  for (const [i, item] of (list ?? []).entries()) {
    if (!item?.image) continue;
    const image = await resolveImage(item.image, `${prefix}-${i + 1}`);
    if (image)
      images.push({ id: `image/${prefix}/${i + 1}`, ...image, altText: item.alt ?? fallbackAlt });
  }
  return images;
}

/** Reads every product (newest first) and the site photos. */
export async function loadContent({
  dir = 'content',
  outputDir,
  resolveImage,
  warn = console.warn,
}) {
  resolveImage ??= imageResolver(outputDir, { warn });
  const files = (await readdir(join(dir, 'products'))).filter((f) => f.endsWith('.json'));
  const entries = await Promise.all(
    files.map(async (f) => ({
      handle: slug(f.replace(/\.json$/, '')),
      entry: JSON.parse(await readFile(join(dir, 'products', f), 'utf8')),
    })),
  );
  // Newest first: the home page shows the first six.
  entries.sort((a, b) => String(b.entry.added ?? '').localeCompare(String(a.entry.added ?? '')));

  const products = [];
  for (const { handle, entry } of entries) {
    const images = await resolveAll(
      entry.images,
      handle,
      resolveImage,
      `${entry.title}, a painting by Calico Melton.`,
    );
    const product = productFromEntry(handle, entry, images, { warn });
    if (product) {
      product.clip = await clipFor(entry.clip?.video, entry.clip?.alt, { warn });
      products.push(product);
    }
  }

  let photos = { homeHero: null, aboutPortrait: null, studio: [] };
  try {
    const raw = JSON.parse(await readFile(join(dir, 'photos.json'), 'utf8'));
    const one = async (item, name) =>
      item?.image ? (await resolveAll([item], name, resolveImage, ''))[0] : null;
    const hero = await one(raw.homeHero, 'photo-home');
    const portrait = await one(raw.aboutPortrait, 'photo-about');
    const portraitClip = await clipFor(raw.aboutPortrait?.video, raw.aboutPortrait?.alt, { warn });
    const studio = [];
    for (const [i, item] of (raw.studio ?? []).entries()) {
      const image = await one(item, `photo-studio-${i + 1}`);
      if (image) {
        const video = await clipFor(item.video, item.alt, { warn });
        studio.push({ image, caption: item.caption || null, video });
      }
    }
    photos = {
      homeHero: hero ? { image: hero } : null,
      aboutPortrait: portrait ? { image: portrait, video: portraitClip } : null,
      studio,
    };
  } catch (error) {
    if (error.code !== 'ENOENT') warn(`[content] content/photos.json: ${error.message}`);
  }
  return { products, photos };
}
