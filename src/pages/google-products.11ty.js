// Google Merchant Center product feed (free listings in Google Shopping and Images):
// https://calicomelton.com/google-products.xml. Add it once in Merchant Center as a
// scheduled fetch (daily); it updates with every build. One item per size of each piece.
// Price-on-request work is left out (Google needs a price). Sold work is listed out of stock.
import { imageUrl, widthsFor } from '../scripts/lib/image.js';
import { postageFor } from '../scripts/lib/delivery.js';

export const data = {
  permalink: '/google-products.xml',
  layout: false,
  eleventyExcludeFromCollections: true,
};

const xml = (s) =>
  String(s ?? '').replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c],
  );
const tag = (name, value) =>
  value === undefined || value === null || value === ''
    ? ''
    : `<g:${name}>${xml(value)}</g:${name}>`;
const abs = (siteUrl, image) => `${siteUrl}${imageUrl(image.url, widthsFor(image).at(-1))}`;

// Google's category for "Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork".
const CATEGORY = 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork';

export function render({ shop, site }) {
  const uk = site.delivery.find((d) => d.id === 'uk');
  const items = [];
  for (const p of shop.products) {
    if (p.tags.includes('price-on-request')) continue;
    const original = p.tags.includes('original');
    const url = `${site.url}/shop/${p.handle}/`;
    const images = p.images.nodes.map((i) => abs(site.url, i));
    const postage = uk ? postageFor(uk, [p]).toFixed(2) : null;
    for (const v of p.variants.nodes) {
      const size = original ? p.dimensions?.value : v.title;
      const kind = original ? 'original artwork' : (p.medium?.value ?? 'art print').toLowerCase();
      items.push(
        [
          '<item>',
          tag('id', v.id),
          tag('title', `${p.title}${size ? `, ${size}` : ''}: ${kind} by ${site.name}`),
          tag('description', p.description || `${p.title} by ${site.name}, a Bristol artist.`),
          tag('link', url),
          tag('image_link', images[0]),
          ...images.slice(1, 10).map((i) => tag('additional_image_link', i)),
          tag('availability', v.availableForSale ? 'in_stock' : 'out_of_stock'),
          tag('price', `${Number(v.price.amount).toFixed(2)} ${v.price.currencyCode}`),
          tag('brand', site.name),
          tag('condition', 'new'),
          tag('identifier_exists', 'no'),
          tag('google_product_category', CATEGORY),
          tag('product_type', original ? 'Original artwork' : 'Art prints'),
          original ? '' : tag('item_group_id', p.handle),
          original ? '' : tag('size', v.title),
          postage
            ? `<g:shipping><g:country>GB</g:country><g:price>${postage} GBP</g:price></g:shipping>`
            : '',
          '</item>',
        ]
          .filter(Boolean)
          .join(''),
      );
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${xml(site.name)}</title>
<link>${xml(site.url)}</link>
<description>${xml(site.description)}</description>
${items.join('\n')}
</channel>
</rss>
`;
}
