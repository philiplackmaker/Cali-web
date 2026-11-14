// Contrast results for the /design-system/tokens/ page (same data the CI check uses), in
// light mode and in dark mode (tokens/themes/dark.json over the light values).
import { createRequire } from 'node:module';
import pairs from '../../scripts/contrast-pairs.js';
import { contrastRatio } from '../scripts/lib/contrast.js';

const require = createRequire(import.meta.url);
const light = new Map(require('./designTokens.json').map((t) => [t.path, t.value]));
const dark = new Map([
  ...light,
  ...require('./designTokensDark.json').map((t) => [t.path, t.value]),
]);

const check = (byPath, fg, bg, min) => {
  const ratio = contrastRatio(byPath.get(fg), byPath.get(bg));
  return {
    fgValue: byPath.get(fg),
    bgValue: byPath.get(bg),
    ratio: ratio.toFixed(2),
    pass: ratio >= min,
  };
};

export default pairs.map(([fg, bg, min]) => ({
  fg,
  bg,
  min,
  light: check(light, fg, bg, min),
  dark: check(dark, fg, bg, min),
}));
