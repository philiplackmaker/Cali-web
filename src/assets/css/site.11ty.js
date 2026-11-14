// Bundles all CSS into one file, wrapping each source in its cascade layer:
//   reset < tokens < base < components < patterns < utilities
// Components and patterns are picked up automatically from their folders.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ORDER = '@layer reset, tokens, base, components, patterns, utilities;';

async function cssIn(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.css'))
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

async function layer(name, files) {
  const parts = await Promise.all(
    files.map(async (file) => `/* ${file} */\n${await readFile(file, 'utf8')}`),
  );
  return parts.length ? `@layer ${name} {\n${parts.join('\n')}\n}\n` : '';
}

export const data = {
  permalink: '/assets/css/site.css',
  eleventyExcludeFromCollections: true,
};

export async function render() {
  return buildSiteCss();
}

/** The whole stylesheet as one string. Also inlined into public pages (see eleventy.config.js). */
export async function buildSiteCss() {
  return [
    ORDER,
    await readFile('src/styles/fonts.css', 'utf8'),
    await layer('reset', ['src/styles/reset.css']),
    await layer('tokens', ['src/styles/tokens.css', 'src/styles/tokens-dark.css']),
    await layer('base', ['src/styles/base.css']),
    await layer('components', await cssIn('src/components')),
    await layer('patterns', await cssIn('src/patterns')),
    await layer('utilities', ['src/styles/utilities.css']),
  ].join('\n');
}
