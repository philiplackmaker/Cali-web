// WCAG 2.2 AA: zero axe violations on every page, plus the open drawer and gallery viewer,
// and the main flows with the keyboard only.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockStorefront } from '../support/storefront-mock.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Engines differ little for axe: run it on Chromium desktop and Android Chrome.
test.skip(({ browserName }) => browserName !== 'chromium', 'axe runs on Chromium');

async function pageList(request) {
  const xml = await (await request.get('/sitemap.xml')).text();
  const urls = [...xml.matchAll(/<loc>[^<]*?(\/[^<]*)<\/loc>/g)].map(
    (m) => new URL(m[1], 'http://x').pathname,
  );
  return [...new Set([...urls, '/cart/', '/contact/thanks/', '/404.html'])];
}

test('every page has zero axe violations', async ({ page, request }) => {
  test.setTimeout(180_000);
  await mockStorefront(page);
  const failures = {};
  for (const url of await pageList(request)) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    if (violations.length) {
      failures[url] = violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      );
    }
  }
  expect(failures).toEqual({});
});

test('the open cart drawer and gallery viewer have zero axe violations', async ({ page }) => {
  await mockStorefront(page);
  await page.goto('/shop/sun-hat-with-tulip-print/');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.locator('cart-drawer dialog')).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'View larger' }).click();
  await expect(page.locator('[data-gallery-viewer]')).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
});

test('keyboard only: choose a print, add it, edit the basket, close it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile-chrome', 'keyboard flow is a desktop check');
  await mockStorefront(page);
  await page.goto('/shop/sun-hat-with-tulip-print/');

  // Skip link first.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();

  // Into the size radios, then arrow to A3.
  const a4 = page.getByRole('radio', { name: 'A4' });
  await a4.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'A3' })).toBeChecked();
  await expect(page.locator('[data-buy] [data-price]')).toHaveText('£75');

  // Tab on to the button and press Enter.
  const add = page.getByRole('button', { name: 'Add to basket' });
  while (!(await add.evaluate((el) => el === document.activeElement)))
    await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  // The drawer takes focus; quantity with the arrow keys.
  const dialog = page.locator('cart-drawer dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close basket' })).toBeFocused();
  const qty = dialog.getByRole('spinbutton');
  while (!(await qty.evaluate((el) => el === document.activeElement)))
    await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowUp');
  await expect(dialog.locator('[data-cart-subtotal]')).toHaveText('£150');

  // Escape closes, and focus goes back to the button that opened it.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(add).toBeFocused();
});
