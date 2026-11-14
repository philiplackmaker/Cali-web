// Products → { [variantId]: merchandise }: the lookup the basket (in the browser) and the
// checkout function (on Netlify) both read, from /assets/data/catalog.json.

export function variantIndex(products) {
  const merchandise = {};
  for (const p of products) {
    for (const v of p.variants.nodes) {
      merchandise[v.id] = {
        ...v,
        product: { id: p.id, title: p.title, handle: p.handle, tags: p.tags },
      };
    }
  }
  return merchandise;
}
