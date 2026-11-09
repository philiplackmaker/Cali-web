// Checks the built site against the brief's quality bar for things easiest to check in
// the HTML: SEO tags, image sizes, structured data, sitemap, and the JS budget.
// node tests/site/check-site.js [dir] [--launch]
// --launch also fails on placeholder copy or mock data: the go-live gate (see LAUNCH.md).
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const launch = args.includes('--launch');
const dir = args.find((a) => !a.startsWith('--')) ?? '_site';
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(dir);
const pages = files.filter((f) => f.endsWith('.html') && !f.includes(`${sep}design-system${sep}`));
const seen = { title: new Map(), description: new Map() };

for (const file of pages) {
  const rel = relative(dir, file);
  const html = await readFile(file, 'utf8');
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  const description = attr(html.match(/<meta name="description"[^>]*>/)?.[0] ?? '', 'content');
  if (!title) fail(rel, 'no <title>');
  if (!description) fail(rel, 'no meta description');
  if (!noindex) {
    for (const [key, value] of [
      ['title', title],
      ['description', description],
    ]) {
      if (seen[key].has(value))
        fail(rel, `${key} also used by ${seen[key].get(value)}: "${value}"`);
      seen[key].set(value, rel);
    }
    if (!/<link rel="canonical" href="https?:\/\//.test(html))
      fail(rel, 'no absolute canonical URL');
    const og = attr(html.match(/<meta property="og:image"[^>]*>/)?.[0] ?? '', 'content');
    if (!og?.startsWith('http')) fail(rel, 'og:image missing or not absolute');
  }
  if (!/<html lang="en-GB"/.test(html)) fail(rel, 'html lang is not en-GB');
  if (launch) {
    if (/data-commerce="mock"/.test(html)) fail(rel, 'built with the mock catalogue, not Shopify');
    if (/TODO copy|Placeholder|placeholder copy/i.test(html.replace(/placeholder="[^"]*"/g, '')))
      fail(rel, 'still has placeholder copy (search the template for TODO)');
  }

  // Every image has width and height (no layout shift), and alt (even if empty).
  // Images inside <template> (cart lines) are filled in by JS, so skip those.
  const visible = html.replace(/<template[\s\S]*?<\/template>/g, '');
  for (const img of visible.match(/<img\b[^>]*>/g) ?? []) {
    if (!attr(img, 'width') || !attr(img, 'height'))
      fail(rel, `img without width/height: ${img.slice(0, 80)}`);
    if (!/\salt="/.test(img)) fail(rel, `img without alt: ${img.slice(0, 80)}`);
  }

  // Product pages: JSON-LD with an offer and availability, and a preloaded LCP image.
  if (
    /^shop\/[^/]+\/index\.html$/.test(rel.split(sep).join('/')) &&
    !/^shop\/(originals|prints)\//.test(rel)
  ) {
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    let ld;
    try {
      ld = JSON.parse(json);
    } catch {
      fail(rel, 'Product JSON-LD missing or invalid');
    }
    if (ld) {
      if (ld['@type'] !== 'Product') fail(rel, 'JSON-LD is not a Product');
      const priceOnRequest = /Price on request/.test(html);
      const offers = ld.offers?.offers ?? (ld.offers ? [ld.offers] : []);
      if (
        !priceOnRequest &&
        !offers.every((o) => /^https:\/\/schema\.org\/(InStock|SoldOut)$/.test(o.availability))
      )
        fail(rel, 'Offer without availability');
    }
    if (!/<link rel="preload" as="image"[^>]*fetchpriority="high"/.test(html))
      fail(rel, 'LCP image not preloaded');
  }
}

const home = await readFile(join(dir, 'index.html'), 'utf8');
if (!/<link rel="preload" as="image"/.test(home)) fail('index.html', 'hero image not preloaded');

// Sitemap: every URL exists in the build.
const sitemap = await readFile(join(dir, 'sitemap.xml'), 'utf8');
for (const [, path] of sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)) {
  const target = path.endsWith('/') ? join(dir, path, 'index.html') : join(dir, path);
  if (!files.includes(target)) fail('sitemap.xml', `lists ${path}, which isn't built`);
}
if (!(await readFile(join(dir, 'robots.txt'), 'utf8')).includes('Sitemap:'))
  fail('robots.txt', 'no Sitemap line');

// JS budget: everything a shop page could load, gzipped, under 30 KB. Docs and mock-only files excluded.
const js = files.filter(
  (f) =>
    f.endsWith('.js') &&
    f.includes(`${sep}assets${sep}js${sep}`) &&
    !/docs-demo|mock-storefront|contrast/.test(f),
);
const gz = (await Promise.all(js.map((f) => readFile(f)))).reduce(
  (n, b) => n + gzipSync(b).length,
  0,
);
const kb = (gz / 1024).toFixed(1);
if (gz > 30 * 1024) fail('assets/js', `shop JS is ${kb} KB gzipped, over the 30 KB budget`);

if (problems.length) {
  console.error(problems.map((p) => `✖ ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s) in ${pages.length} pages.`);
  process.exit(1);
}
console.log(
  `✔ ${pages.length} pages pass the site checks. All shop JS together: ${kb} KB gzipped (budget 30 KB).`,
);
