// Every day at 04:00 UTC: refresh the Instagram token (so it doesn't expire after 60 days),
// then rebuild the site only if Cali has posted since the last build.
//
// Why "only if": on Netlify's free plan each production deploy costs 15 of the 300 monthly
// credits, and the site pauses if they run out. A blind nightly rebuild would be 450 a month.
// Edits in /admin/ deploy by themselves (each Publish is a commit), so they don't need this.
//
// Needs NETLIFY_BUILD_HOOK_URL; does nothing without INSTAGRAM_ACCESS_TOKEN.

const GRAPH = 'https://graph.instagram.com';

async function refreshInstagramToken(token) {
  // Long-lived Instagram tokens can be refreshed once they're a day old. Best effort.
  const url = `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    console.warn(`Instagram token refresh failed: ${body.error?.message ?? res.status}`);
    return;
  }
  const days = Math.round((body.expires_in ?? 0) / 86400);
  if (body.access_token !== token) {
    console.warn(
      `Instagram issued a new token (valid ${days} days). Update INSTAGRAM_ACCESS_TOKEN in Netlify to keep the posts showing.`,
    );
  } else {
    console.log(`Instagram token refreshed, valid for ${days} more days.`);
  }
}

/** The links of Instagram's 3 latest posts, newest first. */
export async function latestPostLinks(token, fetchImpl = fetch) {
  const url = `${GRAPH}/me/media?fields=permalink&limit=3&access_token=${encodeURIComponent(token)}`;
  const res = await fetchImpl(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message ?? `Instagram ${res.status}`);
  return (body.data ?? []).map((post) => post.permalink).filter(Boolean);
}

/** The links the live site shows (written by src/assets/data/instagram-posts.11ty.js). */
export async function liveSiteLinks(siteUrl, fetchImpl = fetch) {
  const res = await fetchImpl(new URL('/assets/data/instagram-posts.json', siteUrl));
  return res.ok ? res.json() : [];
}

export const sameLinks = (a, b) => a.length === b.length && a.every((link, i) => link === b[i]);

export default async () => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return new Response('No INSTAGRAM_ACCESS_TOKEN: nothing to do.');
  await refreshInstagramToken(token);

  let latest;
  let live;
  try {
    [latest, live] = await Promise.all([
      latestPostLinks(token),
      liveSiteLinks(process.env.URL ?? 'https://calicomelton.com'),
    ]);
  } catch (error) {
    console.warn(`Couldn't compare Instagram posts: ${error.message}. Not rebuilding.`);
    return new Response('Instagram check failed; not rebuilding', { status: 502 });
  }
  if (sameLinks(latest, live)) {
    console.log('No new Instagram posts: no rebuild needed.');
    return new Response('No new posts');
  }

  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) return new Response('NETLIFY_BUILD_HOOK_URL is not set', { status: 500 });
  const res = await fetch(hook, { method: 'POST', body: '{}' });
  console.log(
    res.ok ? 'New Instagram posts: rebuild started.' : `Build hook failed: ${res.status}`,
  );
  return new Response(res.ok ? 'Rebuild started' : `Build hook failed: ${res.status}`, {
    status: res.ok ? 200 : 502,
  });
};

// 04:00 UTC daily. Checking is free; only a rebuild uses credits.
export const config = { schedule: '0 4 * * *' };
