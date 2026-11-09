import { test } from 'node:test';
import assert from 'node:assert/strict';
import { altFromCaption, fetchLatestPosts, loadInstagram } from '../../scripts/instagram.js';

const json =
  (body, status = 200) =>
  async () =>
    new Response(JSON.stringify(body), { status });

test('alt text: first sentence, no hashtags or mentions, with the date', () => {
  const alt = altFromCaption(
    'New one drying in the studio. Oil on board. #painting #bristol @someone',
    new Date('2026-11-01T10:00:00Z'),
  );
  assert.equal(alt, 'Instagram post (1 November 2026): New one drying in the studio.');
  assert.equal(altFromCaption('#art #oil', null), 'Instagram post');
});

test('fetches the newest posts; videos use their cover image; posts without an image are skipped', async () => {
  const calls = [];
  const posts = await fetchLatestPosts({
    token: 'tok',
    fetch: async (url) => {
      calls.push(url);
      return json({
        data: [
          {
            id: '1',
            media_type: 'IMAGE',
            media_url: 'https://cdn/1.jpg',
            permalink: 'https://ig/p/1',
            caption: 'One',
          },
          {
            id: '2',
            media_type: 'VIDEO',
            media_url: 'https://cdn/2.mp4',
            thumbnail_url: 'https://cdn/2.jpg',
            permalink: 'https://ig/p/2',
          },
          {
            id: '3',
            media_type: 'CAROUSEL_ALBUM',
            media_url: 'https://cdn/3.jpg',
            permalink: 'https://ig/p/3',
          },
          {
            id: '4',
            media_type: 'VIDEO',
            media_url: 'https://cdn/4.mp4',
            permalink: 'https://ig/p/4',
          },
          {
            id: '5',
            media_type: 'IMAGE',
            media_url: 'https://cdn/5.jpg',
            permalink: 'https://ig/p/5',
          },
        ],
      })();
    },
  });
  assert.match(calls[0], /^https:\/\/graph\.instagram\.com\/me\/media\?fields=/);
  assert.deepEqual(
    posts.map((p) => p.image),
    ['https://cdn/1.jpg', 'https://cdn/2.jpg', 'https://cdn/3.jpg'],
  );
});

test('an expired token is reported clearly', async () => {
  await assert.rejects(
    fetchLatestPosts({
      token: 'old',
      fetch: json({ error: { message: 'Session has expired', code: 190 } }, 400),
    }),
    /token has expired or is invalid/,
  );
});

test('without a token there are no posts, and the build carries on', async () => {
  assert.deepEqual(await loadInstagram({ token: '', outputDir: '_site' }), []);
});
