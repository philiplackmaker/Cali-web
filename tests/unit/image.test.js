import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageUrl, srcset, widthsFor } from '../../src/scripts/lib/image.js';

test('adds width to Shopify CDN URLs', () => {
  assert.equal(
    imageUrl('https://cdn.shopify.com/s/files/1/0001/files/a.jpg?v=12', 640),
    'https://cdn.shopify.com/s/files/1/0001/files/a.jpg?v=12&width=640',
  );
});

test('fills {width} placeholders', () => {
  assert.equal(imageUrl('/m/a-{width}.jpg', 320), '/m/a-320.jpg');
});

test('never upscales past the source width', () => {
  assert.deepEqual(widthsFor({ width: 700 }), [320, 480, 640, 700]);
  assert.equal(srcset({ url: '/a-{width}.jpg', width: 400 }), '/a-320.jpg 320w, /a-400.jpg 400w');
});
