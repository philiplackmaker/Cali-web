// The latest Instagram posts, fetched at build time with the Instagram API (Instagram Login),
// then downloaded and resized onto our own site. Visitors never load anything from Instagram:
// no third-party script, no tracking. Needs INSTAGRAM_ACCESS_TOKEN (see README).
// Any problem (no token, expired token, Instagram down) returns [] and the page falls back
// to the studio photos, so a build never fails because of Instagram.
import Image from '@11ty/eleventy-img';
import { join } from 'node:path';

const API = 'https://graph.instagram.com/me/media';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

/** Short, readable alt text from a caption: the first sentence or line, without hashtags. */
export function altFromCaption(caption, date) {
  const words = (caption ?? '')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/@[\w.]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const first = words.split(/(?<=[.!?])\s|\n/)[0]?.trim() ?? '';
  const short = first.length > 120 ? `${first.slice(0, 117).trimEnd()}…` : first;
  const when = date
    ? ` (${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })})`
    : '';
  return short ? `Instagram post${when}: ${short}` : `Instagram post${when}`;
}

/** The newest posts with an image to show. Videos use their cover image. */
export async function fetchLatestPosts({ token, limit = 3, fetch = globalThis.fetch }) {
  const url = `${API}?fields=${FIELDS}&limit=${limit + 3}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const reason = body.error?.message ?? `HTTP ${res.status}`;
    const expired = body.error?.code === 190;
    throw new Error(
      expired ? `Instagram token has expired or is invalid: ${reason}` : `Instagram API: ${reason}`,
    );
  }
  return (body.data ?? [])
    .map((post) => ({
      id: post.id,
      permalink: post.permalink,
      image: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
      date: post.timestamp ? new Date(post.timestamp) : null,
      caption: post.caption ?? '',
    }))
    .filter((p) => p.image && p.permalink)
    .slice(0, limit);
}

/** Fetch, download and resize. Returns [{ permalink, alt, src, srcset, width, height }] or []. */
export async function loadInstagram({
  token = process.env.INSTAGRAM_ACCESS_TOKEN,
  outputDir,
  limit = 3,
} = {}) {
  if (!token) return [];
  try {
    const posts = await fetchLatestPosts({ token, limit });
    return await Promise.all(
      posts.map(async (post) => {
        const meta = await Image(post.image, {
          widths: [320, 640],
          formats: ['webp'],
          outputDir: join(outputDir, 'assets/images/instagram'),
          urlPath: '/assets/images/instagram/',
          filenameFormat: (id, src, width, format) => `${post.id}-${width}.${format}`,
          cacheOptions: { duration: '1d', directory: '.cache/eleventy-fetch' },
        });
        const sizes = meta.webp;
        const small = sizes[0];
        return {
          permalink: post.permalink,
          alt: altFromCaption(post.caption, post.date),
          src: small.url,
          srcset: sizes.map((s) => `${s.url} ${s.width}w`).join(', '),
          width: small.width,
          height: small.height,
        };
      }),
    );
  } catch (error) {
    console.warn(`[instagram] ${error.message}. Showing studio photos instead.`);
    return [];
  }
}
