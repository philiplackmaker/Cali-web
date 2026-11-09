// Contrast results for the /design-system/tokens/ page (same data the CI check uses).
import { createRequire } from 'node:module';
import pairs from '../../scripts/contrast-pairs.js';
import { contrastRatio } from '../scripts/lib/contrast.js';

const tokens = createRequire(import.meta.url)('./designTokens.json');
const byPath = new Map(tokens.map((t) => [t.path, t]));

export default pairs.map(([fg, bg, min]) => {
  const ratio = contrastRatio(byPath.get(fg).value, byPath.get(bg).value);
  return {
    fg,
    bg,
    fgVar: byPath.get(fg).cssVar,
    bgVar: byPath.get(bg).cssVar,
    min,
    ratio: ratio.toFixed(2),
    pass: ratio >= min,
  };
});
