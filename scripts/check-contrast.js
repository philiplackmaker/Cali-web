// Fails the build if any allowed colour pairing in contrast-pairs.js misses its WCAG ratio,
// in light mode or in dark mode.
import { readFile } from 'node:fs/promises';
import pairs from './contrast-pairs.js';
import { contrastRatio } from '../src/scripts/lib/contrast.js';

const read = (file) => readFile(new URL(`../src/_data/${file}`, import.meta.url)).then(JSON.parse);
const light = new Map((await read('designTokens.json')).map((t) => [t.path, t.value]));
// Dark mode: the light values, with tokens/themes/dark.json's overrides on top.
const dark = new Map([
  ...light,
  ...(await read('designTokensDark.json')).map((t) => [t.path, t.value]),
]);

let failures = 0;
for (const [theme, byPath] of [
  ['light', light],
  ['dark', dark],
]) {
  console.log(`${theme === 'light' ? '' : '\n'}${theme[0].toUpperCase()}${theme.slice(1)} mode`);
  for (const [fg, bg, min] of pairs) {
    if (!byPath.has(fg) || !byPath.has(bg)) {
      console.error(`✖ unknown token in pair: ${fg} on ${bg}`);
      failures++;
      continue;
    }
    const ratio = contrastRatio(byPath.get(fg), byPath.get(bg));
    const ok = ratio >= min;
    if (!ok) failures++;
    console.log(
      `${ok ? '✔' : '✖'} ${ratio.toFixed(2).padStart(5)} : 1  (min ${min})  ${fg} on ${bg}`,
    );
  }
}

if (failures) {
  console.error(`\n${failures} colour pairing(s) fail WCAG AA.`);
  process.exit(1);
}
console.log(`\nAll ${pairs.length} colour pairings pass WCAG AA, in light and dark mode.`);
