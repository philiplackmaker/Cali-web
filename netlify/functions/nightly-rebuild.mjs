// Every night: refresh the Instagram token (so it doesn't expire after 60 days), then rebuild
// the site. The rebuild picks up the latest Instagram posts and any changes Shopify can't send
// a webhook for from its admin (site photos, which are metaobjects).
// Needs NETLIFY_BUILD_HOOK_URL; uses INSTAGRAM_ACCESS_TOKEN if it's set.

async function refreshInstagramToken(token) {
  // Long-lived Instagram tokens can be refreshed once they're a day old. Best effort: if this
  // fails, the build log says so and the Instagram band falls back to studio photos.
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
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

export default async () => {
  if (process.env.INSTAGRAM_ACCESS_TOKEN)
    await refreshInstagramToken(process.env.INSTAGRAM_ACCESS_TOKEN);
  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) return new Response('NETLIFY_BUILD_HOOK_URL is not set', { status: 500 });
  const res = await fetch(hook, { method: 'POST', body: '{}' });
  return new Response(res.ok ? 'Rebuild started' : `Build hook failed: ${res.status}`, {
    status: res.ok ? 200 : 502,
  });
};

// 04:00 UTC daily.
export const config = { schedule: '0 4 * * *' };
