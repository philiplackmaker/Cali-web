import { test } from 'node:test';
import assert from 'node:assert/strict';
import markdownIt from 'markdown-it';
import loadPages from '../../src/_data/pages.js';
import site from '../../src/_data/site.js';

// The fields each page template reads. A save in /admin/ that loses one fails CI, not the page.
const REQUIRED = {
  home: ['description', 'heroEyebrow', 'heroLine', 'introHeading', 'introText', 'introLink'],
  about: ['description', 'title', 'lede', 'studioHeading', 'studioText', 'body'],
  info: ['description', 'title', 'lede', 'shipping', 'body'],
  contact: ['description', 'title', 'lede', 'commissions'],
};

test('every page file has the text its template needs', () => {
  const pages = loadPages();
  for (const [page, fields] of Object.entries(REQUIRED)) {
    assert.ok(pages[page], `content/pages/${page}.json is missing`);
    for (const field of fields) {
      assert.equal(typeof pages[page][field], 'string', `${page}.${field}`);
      assert.ok(pages[page][field].trim(), `${page}.${field} is empty`);
    }
  }
});

test('delivery settings: UK and the rest of the world, with prices', () => {
  assert.deepEqual(
    site.delivery.map((d) => [d.id, typeof d.amount, d.countries === 'world' || d.countries[0]]),
    [
      ['uk', 'number', 'GB'],
      ['world', 'number', true],
    ],
  );
  assert.ok(site.printsDelivery && site.originalsDelivery);
});

test('page Markdown: headings and links work, typed HTML is shown as text', () => {
  const md = markdownIt({ html: false, linkify: true, typographer: true });
  const html = md.render('## Returns\n\nSee [the shop](/shop/). <script>alert(1)</script>');
  assert.match(html, /<h2>Returns<\/h2>/);
  assert.match(html, /<a href="\/shop\/">the shop<\/a>/);
  assert.doesNotMatch(html, /<script>/);
});
