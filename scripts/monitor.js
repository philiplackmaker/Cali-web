// Is the live shop working? Run by .github/workflows/monitor.yml every 30 minutes (and by
// hand: node scripts/monitor.js https://calicomelton.com). Exits 1 if anything fails, which
// makes the GitHub Actions run fail and GitHub emails the repo owner.
//
// Checks: the home page, the shop page and a product page load (status 200, the right
// content, fast enough); /api/health says the catalogue and Stripe are fine.

const SLOW_MS = 5000;

export async function checkSite(base, { fetch: fetchImpl = globalThis.fetch } = {}) {
  const results = [];
  const check = async (name, fn) => {
    const start = Date.now();
    try {
      const detail = await fn();
      results.push({ name, ok: true, ms: Date.now() - start, detail });
    } catch (error) {
      results.push({ name, ok: false, ms: Date.now() - start, detail: error.message });
    }
  };
  const page = async (path, mustInclude) => {
    const start = Date.now();
    const res = await fetchImpl(new URL(path, base), { redirect: 'follow' });
    const html = await res.text();
    const ms = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!html.includes(mustInclude)) throw new Error(`page doesn't mention "${mustInclude}"`);
    if (ms > SLOW_MS) throw new Error(`slow: ${ms} ms`);
    return `HTTP ${res.status}`;
  };

  await check('Home page', () => page('/', 'Calico Melton'));
  await check('Shop page', () => page('/shop/', 'ds-card-grid'));
  await check('A product page', async () => {
    const catalog = await (await fetchImpl(new URL('/assets/data/catalog.json', base))).json();
    const handle = Object.values(catalog)[0]?.product.handle;
    if (!handle) throw new Error('the catalogue is empty');
    return page(`/shop/${handle}/`, 'Add to basket');
  });
  await check('Checkout and Stripe (/api/health)', async () => {
    const res = await fetchImpl(new URL('/api/health', base));
    const body = await res.json().catch(() => ({}));
    const summary = Object.entries(body.checks ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
    if (!res.ok || !body.ok) throw new Error(summary || `HTTP ${res.status}`);
    return summary;
  });
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const base = process.argv[2] ?? process.env.MONITOR_URL;
  if (!base) {
    console.error('Usage: node scripts/monitor.js https://calicomelton.com');
    process.exit(2);
  }
  const results = await checkSite(base);
  for (const r of results) {
    console.log(`${r.ok ? '✔' : '✖'} ${r.name} (${r.ms} ms): ${r.detail}`);
    if (!r.ok && process.env.GITHUB_ACTIONS) console.log(`::error title=${r.name}::${r.detail}`);
  }
  if (results.some((r) => !r.ok)) {
    console.error(`\n${base} has a problem. See the list above.`);
    process.exit(1);
  }
  console.log(`\n${base} is working.`);
}
