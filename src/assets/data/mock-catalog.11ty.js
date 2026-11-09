// Variant lookup for the browser's mock Storefront client: { [variantId]: merchandise }.
export const data = {
  permalink: '/assets/data/mock-catalog.json',
  eleventyExcludeFromCollections: true,
};

// Covers both the docs' mock products and the preview's real catalogue.
export function render({ mock, catalogue }) {
  const merchandise = {};
  for (const p of [...mock.products, ...catalogue.products]) {
    for (const v of p.variants.nodes) {
      merchandise[v.id] = {
        ...v,
        product: { id: p.id, title: p.title, handle: p.handle, tags: p.tags },
      };
    }
  }
  return JSON.stringify(merchandise);
}
