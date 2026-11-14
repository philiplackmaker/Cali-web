export default {
  section: 'Components',
  eleventyComputed: {
    permalink: (data) => `/design-system/components/${data.page.fileSlug}/`,
  },
};
