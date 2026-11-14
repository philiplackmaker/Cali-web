// Preload for the e2e build (npm run build:e2e): answers the build's Instagram API calls with
// three fake posts, with images served from a local painting.
import { readFile } from 'node:fs/promises';

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
  return realFetch(url, init);
};
