import { artistJsonLd } from '../scripts/lib/structured-data.js';

export default {
  eleventyComputed: {
    preloadImage: (data) => data.shop.photos.homeHero.image,
    jsonLd: (data) => artistJsonLd(data.site),
  },
};
