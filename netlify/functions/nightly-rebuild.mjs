// Rebuilds the site every night, to pick up changes Shopify can't send a webhook for
// from its admin (site photos, which are metaobjects) and as a safety net for products.
// Needs NETLIFY_BUILD_HOOK_URL set in Netlify's environment variables.

export default async () => {
  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) return new Response('NETLIFY_BUILD_HOOK_URL is not set', { status: 500 });
  const res = await fetch(hook, { method: 'POST', body: '{}' });
  return new Response(res.ok ? 'Rebuild started' : `Build hook failed: ${res.status}`, {
    status: res.ok ? 200 : 502,
  });
};

// 04:00 UTC daily.
export const config = { schedule: '0 4 * * *' };
