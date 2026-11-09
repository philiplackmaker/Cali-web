// Preload for the e2e build (npm run build:e2e): answers the build's Storefront API calls
// with the mock catalogue, so pages are built in "storefront" mode without a real store,
// and the Instagram API with three fake posts (images served from a local painting).
import { readFile } from 'node:fs/promises';

const { default: mock } = await import(new URL('../../src/_data/mock.js', import.meta.url));
const painting = await readFile(
  new URL('../../src/assets/images/calico-painting.jpg', import.meta.url),
);
const realFetch = globalThis.fetch;

export const FAKE_INSTAGRAM_POSTS = [1, 2, 3].map((n) => ({
  id: `e2e${n}`,
  media_type: 'IMAGE',
  media_url: `https://scontent.cdninstagram.example/e2e${n}.jpg`,
  permalink: `https://www.instagram.com/p/E2E${n}/`,
  caption: `Studio day ${n}. Paint everywhere. #studio`,
  timestamp: `2026-11-0${n}T10:00:00+0000`,
}));

globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://graph.instagram.com/')) {
    return new Response(JSON.stringify({ data: FAKE_INSTAGRAM_POSTS }), { status: 200 });
  }
  if (String(url).startsWith('https://scontent.cdninstagram.example/')) {
    return new Response(painting, { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
  }
  if (!/\/api\/[\d-]+\/graphql\.json$/.test(String(url))) return realFetch(url, init);
  const { query } = JSON.parse(init.body);
  const data = query.includes('products(')
    ? { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: mock.products } }
    : { metaobjects: { nodes: [] } };
  return new Response(JSON.stringify({ data }), { status: 200 });
};
