// The brief's flows: browse, add a print, change quantity, remove, reach Shopify checkout.
// Runs against the e2e build (storefront mode) with the Storefront API mocked in the browser.
import { test, expect } from '@playwright/test';
import { mockStorefront } from '../support/storefront-mock.js';

const drawer = (page) => page.locator('cart-drawer:not([data-inline]) dialog');

test.beforeEach(async ({ page }) => {
  await mockStorefront(page);
});

test('browse: home → originals → prints → a painting', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Calico Melton' })).toBeVisible();
  await page.getByRole('link', { name: 'See the originals' }).click();
  await expect(page).toHaveURL(/\/shop\/originals\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Originals' })).toBeVisible();
  const filter = page.getByRole('navigation', { name: 'Filter the shop' });
  await expect(filter.getByRole('link', { name: /Originals/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await filter.getByRole('link', { name: /Prints/ }).click();
  await expect(page).toHaveURL(/\/shop\/prints\/$/);
  await page.getByRole('link', { name: 'Small Tulip, print' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Small Tulip, print' })).toBeVisible();
});

test('add a print, change quantity, remove it', async ({ page }) => {
  await page.goto('/shop/sun-hat-with-tulip-print/');
  await page.getByRole('radio', { name: 'A3' }).check();
  await page.getByRole('radio', { name: 'Smooth matte' }).check();
  await expect(page.locator('[data-buy] [data-price]')).toHaveText('£75');
  await page.getByRole('button', { name: 'Add to basket' }).click();

  await expect(drawer(page)).toBeVisible();
  const line = drawer(page).locator('.ds-cart-line');
  await expect(line).toHaveCount(1);
  await expect(line).toContainText('A3 / Smooth matte');
  await expect(drawer(page).locator('[data-cart-subtotal]')).toHaveText('£75');
  await expect(page.locator('[data-cart-announcer]')).toContainText('Added');

  await line.getByRole('button', { name: /Increase quantity/ }).click();
  await expect(drawer(page).locator('[data-cart-subtotal]')).toHaveText('£150');
  await expect(line.getByRole('spinbutton')).toHaveValue('2');

  await line.getByRole('button', { name: /Remove/ }).click();
  await expect(drawer(page).locator('.ds-cart-line')).toHaveCount(0);
  await expect(drawer(page)).toContainText('Your basket is empty.');
});

test('reach the Shopify checkout URL', async ({ page }) => {
  await page.goto('/shop/blue-jug/');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(drawer(page)).toBeVisible();
  const checkout = drawer(page).getByRole('link', { name: 'Checkout' });
  await expect(checkout).toHaveAttribute('href', /^https:\/\/checkout\.example\//);
  await checkout.click();
  await expect(page).toHaveTitle('Shopify checkout');
});

test('the basket survives a page load, and /cart/ shows it', async ({ page }) => {
  await page.goto('/shop/small-tulip-print/');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(drawer(page)).toBeVisible();
  await page.goto('/cart/');
  await expect(page.getByRole('heading', { level: 1, name: 'Your basket' })).toBeVisible();
  await expect(page.locator('.ds-cart-line')).toContainText('Small Tulip, print');
  await expect(page.getByRole('link', { name: /Basket, 1 item/ })).toBeVisible();
});

test('an original goes in once, then says "In your basket"', async ({ page }) => {
  await page.goto('/shop/pink-check/');
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'In your basket' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'View your basket' })).toBeVisible();
});
