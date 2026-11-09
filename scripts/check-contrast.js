// Fails the build if any allowed colour pairing in contrast-pairs.js misses its WCAG ratio.
import { readFile } from 'node:fs/promises';
import pairs from './contrast-pairs.js';
import { contrastRatio } from '../src/scripts/lib/contrast.js';

const tokens = JSON.parse(
  await readFile(new URL('../src/_data/designTokens.json', import.meta.url)),
);
const byPath = new Map(tokens.map((t) => [t.path, t.value]));

let failures = 0;
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

if (failures) {
  console.error(`\n${failures} colour pairing(s) fail WCAG AA.`);
  process.exit(1);
}
console.log(`\nAll ${pairs.length} colour pairings pass WCAG AA.`);
