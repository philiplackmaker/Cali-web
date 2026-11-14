export default {
  section: 'Patterns',
  eleventyComputed: {
    permalink: (data) => `/design-system/patterns/${data.page.fileSlug}/`,
  },
};
