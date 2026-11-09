// The brief's edge cases: sold originals, two buyers, Storefront API down.
import { test, expect } from '@playwright/test';
import { mockStorefront } from '../support/storefront-mock.js';

test('a sold original keeps its page, with an enquiry link and no basket button', async ({
  page,
}) => {
  await mockStorefront(page);
  const res = await page.goto('/shop/afternoon-montpelier/');
  expect(res.status()).toBe(200);
  await expect(page.getByText('This painting has found a home.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enquire about similar work' })).toHaveAttribute(
    'href',
    '/contact/?about=afternoon-montpelier',
  );
  await expect(page.getByRole('button', { name: 'Add to basket' })).toHaveCount(0);
});

test('an original sold since the build shows as sold when the page opens', async ({ page }) => {
  await mockStorefront(page, { sold: ['gid://shopify/ProductVariant/1021'] });
  await page.goto('/shop/pink-check/');
  await expect(page.getByText('This painting has found a home.')).toBeVisible();
  await expect(page.locator('.ds-product .ds-badge--sold')).toBeVisible();
});

test('two buyers: a painting someone else bought comes out of the basket, with a message', async ({
  page,
}) => {
  const shop = await mockStorefront(page);
  await page.goto('/shop/blue-jug/');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(page.locator('cart-drawer dialog .ds-cart-line')).toHaveCount(1);
  await page.keyboard.press('Escape');

  // Another buyer checks out first.
  shop.sell('gid://shopify/ProductVariant/1041');
  await page.goto('/shop/');
  await page.getByRole('link', { name: /Basket/ }).click();
  const dialog = page.locator('cart-drawer dialog');
  await expect(
    dialog.getByText('Sorry, “Blue Jug” has just sold, so I’ve taken it out of your basket.'),
  ).toBeVisible();
  await expect(dialog.locator('.ds-cart-line')).toHaveCount(0);
});

test('Storefront API down: the page still reads, buying pauses with a message', async ({
  page,
}) => {
  await mockStorefront(page, { down: true });
  await page.goto('/shop/sun-hat-with-tulip/');
  await expect(page.getByRole('heading', { level: 1, name: 'Sun Hat with Tulip' })).toBeVisible();
  await expect(page.locator('[data-buy] [data-price]')).toHaveText('£950');
  await expect(page.getByRole('button', { name: 'Add to basket' })).toBeDisabled();
  await expect(page.getByText('I can’t check what’s available just now')).toBeVisible();
});

test('no JS: product pages offer buy links straight to Shopify checkout', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/shop/sun-hat-with-tulip-print/');
  const buy = page.getByRole('link', { name: 'Buy A4 / Smooth matte, £45' });
  await expect(buy).toHaveAttribute('href', 'https://e2e-shop.myshopify.com/cart/2011:1');
  // Sold-out combinations aren't offered.
  await expect(page.getByRole('link', { name: /Buy A2 \/ Cotton rag/ })).toHaveCount(0);
  await context.close();
});
