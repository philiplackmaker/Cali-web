import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, parseColor, composite } from '../../src/scripts/lib/contrast.js';

test('black on white is 21:1', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF').toFixed(1), '21.0');
});

test('same colour is 1:1', () => {
  assert.equal(contrastRatio('#7C93A8', '#7C93A8'), 1);
});

test('parses short hex and rgba', () => {
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('rgba(42, 30, 26, 0.68)'), { r: 42, g: 30, b: 26, a: 0.68 });
});

test('composites a translucent colour over its background', () => {
  assert.deepEqual(composite(parseColor('rgba(0, 0, 0, 0.5)'), parseColor('#FFFFFF')), {
    r: 128,
    g: 128,
    b: 128,
    a: 1,
  });
});

test('rejects a translucent background', () => {
  assert.throws(() => contrastRatio('#000', 'rgba(0,0,0,0.5)'));
});
