import { readdirSync } from 'node:fs';
import nunjucks from 'nunjucks';
import { formatMoney, describePrice } from './src/scripts/lib/money.js';
import { srcset, imageUrl, widthsFor } from './src/scripts/lib/image.js';
import * as product from './src/scripts/lib/product.js';
import site from './src/_data/site.js';
import { buildTokens } from './scripts/build-tokens.js';
import { loadInstagram } from './scripts/instagram.js';
import { loadShop } from './scripts/shop.js';
import { buildSiteCss } from './src/assets/css/site.11ty.js';

export default function (eleventyConfig) {
  // Let templates include partials by path from src/, e.g.
  // {% include "components/button/button.njk" %}, as well as from _includes/.
  const njk = new nunjucks.Environment(new nunjucks.FileSystemLoader(['src/_includes', 'src']), {
    autoescape: true,
  });
  // Imported macros don't see page data, so site settings are a global they can always read.
  njk.addGlobal('site', site);
  eleventyConfig.setLibrary('njk', njk);

  // Component and pattern folders hold partials and READMEs, not pages.
  eleventyConfig.ignores.add('src/components/**');
  eleventyConfig.ignores.add('src/patterns/**');
  eleventyConfig.ignores.add('**/README.md');

  eleventyConfig.addPassthroughCopy({ 'src/assets/images': 'assets/images' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/favicon*': '/' });
  // The CMS admin (Decap): a static page and its config.
  eleventyConfig.addPassthroughCopy({ 'src/admin': 'admin' });
  // Uploaded originals, so the admin can show thumbnails. Pages use the resized WebP copies.
  eleventyConfig.addPassthroughCopy({ 'content/uploads': 'content/uploads' });
  // Browser JS keeps the source tree's shape, so relative imports work the same in
  // Node tests and in the browser: src/components/x/x.js → /assets/js/components/x/x.js
  eleventyConfig.addPassthroughCopy({ 'src/scripts': 'assets/js/scripts' });
  for (const dir of ['components', 'patterns']) {
    for (const entry of readdirSync(`src/${dir}`, { recursive: true })) {
      if (entry.endsWith('.js')) {
        eleventyConfig.addPassthroughCopy({ [`src/${dir}/${entry}`]: `assets/js/${dir}/${entry}` });
      }
    }
  }
  for (const file of FONT_FILES) {
    eleventyConfig.addPassthroughCopy({
      [`node_modules/@fontsource/${file}`]: `assets/fonts/${file.split('/').pop()}`,
    });
  }

  // Public pages inline the stylesheet: it's small (~12 KB gzipped), and saving the extra
  // request keeps mobile LCP well under 2.5 s. Built once per build.
  let siteCss;
  eleventyConfig.on('eleventy.before', () => {
    siteCss = null;
  });
  eleventyConfig.addNunjucksAsyncShortcode('siteCss', async () => {
    siteCss ??= buildSiteCss();
    return siteCss;
  });

  // The catalogue (Google Sheet, local copy, or test fixture): see scripts/shop.js. Loaded
  // once per build or dev-server run (restart to re-read the sheet).
  let shop;
  eleventyConfig.addGlobalData('shop', () => {
    shop ??= loadShop({ outputDir: eleventyConfig.directories.output });
    return shop;
  });

  // The latest Instagram posts (or [] without a token): see scripts/instagram.js.
  let instagram;
  eleventyConfig.addGlobalData('instagram', () => {
    instagram ??= loadInstagram({ outputDir: eleventyConfig.directories.output }).then((posts) => {
      if (posts.length) console.log(`[instagram] ${posts.length} latest posts.`);
      return { posts };
    });
    return instagram;
  });

  // Tokens are compiled before every build, so editing /tokens/*.json shows up live.
  eleventyConfig.on('eleventy.before', () => buildTokens({ quiet: true }));
  eleventyConfig.addWatchTarget('tokens/');
  eleventyConfig.addWatchTarget('src/styles/');
  eleventyConfig.addWatchTarget('src/components/');
  eleventyConfig.addWatchTarget('src/patterns/');
  eleventyConfig.addWatchTarget('src/design-system/docs.css');
  eleventyConfig.addWatchTarget('content/');

  // Commerce helpers, shared with the browser so build and runtime agree.
  eleventyConfig.addFilter('money', (money) => formatMoney(money));
  eleventyConfig.addFilter('describePrice', (input) => describePrice(input));
  eleventyConfig.addFilter('srcset', (image) => srcset(image));
  eleventyConfig.addFilter('imageUrl', (url, width) => imageUrl(url, width));
  eleventyConfig.addFilter('largestWidth', (image) => widthsFor(image).at(-1));
  eleventyConfig.addFilter('isOriginal', product.isOriginal);
  eleventyConfig.addFilter('isSold', product.isSold);
  eleventyConfig.addFilter('isPriceOnRequest', product.isPriceOnRequest);
  eleventyConfig.addFilter('productSummary', product.productSummary);
  eleventyConfig.addFilter('productBadges', product.productBadges);
  eleventyConfig.addFilter('editionSize', product.editionSize);
  eleventyConfig.addFilter('optionStates', product.optionStates);
  // products | without(product) | take(3)
  eleventyConfig.addFilter('without', (list, item) => list.filter((x) => x.handle !== item.handle));
  eleventyConfig.addFilter('take', (list, n) => list.slice(0, n));
  // Safe to embed in <script type="application/json">.
  eleventyConfig.addFilter('jsonScript', (value) => JSON.stringify(value).replace(/</g, '\\u003c'));
  // Docs: show rendered markup as code, tidied and always escaped.
  eleventyConfig.addFilter('asCode', (html) => {
    const lines = String(html)
      .replace(/^\s*\n|\s+$/g, '')
      .split('\n');
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    const text = lines
      .map((l) => l.slice(indent))
      .filter((l, i, all) => l.trim() || all[i - 1]?.trim())
      .join('\n');
    return text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  });

  // tokens | tokensAt("color.surface") | tokensAt("space", "primitive")
  eleventyConfig.addFilter('tokensAt', (tokens, prefix, tier) =>
    tokens.filter(
      (t) => (t.path === prefix || t.path.startsWith(`${prefix}.`)) && (!tier || t.tier === tier),
    ),
  );
  // For places CSS variables can't reach, like <meta name="theme-color">.
  eleventyConfig.addFilter('tokenValue', (tokens, path) => {
    const token = tokens.find((t) => t.path === path);
    if (!token) throw new Error(`Unknown token: ${path}`);
    return token.value;
  });
  // tokens | tokensAtAny(["font.family", "font.weight"])
  eleventyConfig.addFilter('tokensAtAny', (tokens, prefixes) =>
    tokens.filter((t) => prefixes.some((p) => t.path === p || t.path.startsWith(`${p}.`))),
  );
  eleventyConfig.addFilter('tokenTail', (path, prefix) => path.slice(prefix.length + 1) || path);

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      layouts: '_layouts',
      data: '_data',
    },
    templateFormats: ['njk', 'md', '11ty.js'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}

const FONT_FILES = [
  'lora/files/lora-latin-500-normal.woff2',
  'lora/files/lora-latin-500-italic.woff2',
  'lora/files/lora-latin-700-normal.woff2',
  'figtree/files/figtree-latin-400-normal.woff2',
  'figtree/files/figtree-latin-400-italic.woff2',
  'figtree/files/figtree-latin-500-normal.woff2',
  'figtree/files/figtree-latin-600-normal.woff2',
];
