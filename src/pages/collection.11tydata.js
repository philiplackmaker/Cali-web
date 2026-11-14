// Shop pages: the first painting is the LCP image, so preload it at the card's sizes.
export default {
  eleventyComputed: {
    preloadImage: (data) => data.collection?.products[0]?.featuredImage,
    preloadSizes: '(width >= 64rem) 33vw, (width >= 40rem) 50vw, 100vw',
  },
};
