// Variant lookup for the browser's mock Storefront client: { [variantId]: merchandise }.
export const data = {
  permalink: '/assets/data/mock-catalog.json',
  eleventyExcludeFromCollections: true,
};

export function render({ mock }) {
  const merchandise = {};
  for (const p of mock.products) {
    for (const v of p.variants.nodes) {
      merchandise[v.id] = {
        ...v,
        product: { id: p.id, title: p.title, handle: p.handle, tags: p.tags },
      };
    }
  }
  return JSON.stringify(merchandise);
}
