// Preload for the e2e build (npm run build:e2e): answers the build's Storefront API calls
// with the mock catalogue, so pages are built in "storefront" mode without a real store.
const { default: mock } = await import(new URL('../../src/_data/mock.js', import.meta.url));
const realFetch = globalThis.fetch;

globalThis.fetch = async (url, init) => {
  if (!/\/api\/[\d-]+\/graphql\.json$/.test(String(url))) return realFetch(url, init);
  const { query } = JSON.parse(init.body);
  const data = query.includes('products(')
    ? { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: mock.products } }
    : { metaobjects: { nodes: [] } };
  return new Response(JSON.stringify({ data }), { status: 200 });
};
