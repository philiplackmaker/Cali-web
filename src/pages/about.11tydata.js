// The photo of Cali is the About page's LCP image: preload it at the artist intro's sizes.
export default {
  eleventyComputed: {
    preloadImage: (data) => data.shop.photos.aboutPortrait?.image,
    preloadSizes: '(width >= 53.75rem) 30vw, 100vw',
  },
};
