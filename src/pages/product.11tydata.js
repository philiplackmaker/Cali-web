import { productJsonLd } from '../scripts/lib/structured-data.js';
import { imageUrl, widthsFor } from '../scripts/lib/image.js';
import { isOriginal, isSold, productSummary } from '../scripts/lib/product.js';

export default {
  eleventyComputed: {
    // "Blue Tulips, art print · Calico Melton": what people search for, after the name.
    title: (data) =>
      `${data.product.title}, ${isOriginal(data.product) ? 'original artwork' : 'art print'}`,
    description: (data) => {
      const p = data.product;
      const kind = isOriginal(p) ? 'Original painting' : 'Giclée print';
      const status = isSold(p) ? ' Sold.' : '';
      return `${p.title}: ${kind.toLowerCase()} by Calico Melton. ${productSummary(p)}.${status}`;
    },
    ogImage: (data) => {
      const img = data.product.featuredImage;
      return img ? imageUrl(img.url, widthsFor(img).at(-1)) : undefined;
    },
    preloadImage: (data) => data.product.featuredImage,
    jsonLd: (data) => productJsonLd(data.product, data.site),
  },
};
