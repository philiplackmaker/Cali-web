import { productJsonLd } from '../scripts/lib/structured-data.js';
import { imageUrl, widthsFor } from '../scripts/lib/image.js';
import { isOriginal, isSold, productSummary } from '../scripts/lib/product.js';

export default {
  eleventyComputed: {
    title: (data) => data.product.title,
    description: (data) => {
      const p = data.product;
      const kind = isOriginal(p) ? 'Original painting' : 'Signed print';
      const status = isSold(p) ? ' Sold.' : '';
      return `${kind} by Calico Melton. ${productSummary(p)}.${status}`;
    },
    ogImage: (data) => {
      const img = data.product.featuredImage;
      return img ? imageUrl(img.url, widthsFor(img).at(-1)) : undefined;
    },
    preloadImage: (data) => data.product.featuredImage,
    jsonLd: (data) => productJsonLd(data.product, data.site),
  },
};
