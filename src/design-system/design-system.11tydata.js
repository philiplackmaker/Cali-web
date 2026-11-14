export default {
  layout: 'docs.njk',
  tags: ['designSystem'],
  section: 'Foundations',
  eleventyComputed: {
    // Internal docs: never in the sitemap.
    eleventyExcludeFromSitemap: () => true,
  },
};
