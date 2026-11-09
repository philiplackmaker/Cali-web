// The brief's flows: browse, add a print, change quantity, remove, reach Stripe checkout.
// Runs against the e2e build (test products), with the checkout function and Stripe mocked.
import { test, expect } from '@playwright/test';
import { mockShop } from '../support/shop-mock.js';

const drawer = (page) => page.locator('cart-drawer:not([data-inline]) dialog');

let shop;
test.beforeEach(async ({ page }) => {
  shop = await mockShop(page);
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

test('checkout posts the basket and delivery choice, and lands on Stripe', async ({ page }) => {
  await page.goto('/shop/sun-hat-with-tulip-print/');
  await page.getByRole('radio', { name: 'A3' }).check();
  await page.getByRole('button', { name: 'Add to basket' }).click();
  await expect(drawer(page)).toBeVisible();
  await drawer(page)
    .locator('.ds-cart-line')
    .getByRole('button', { name: /Increase/ })
    .click();
  await expect(drawer(page).locator('[data-cart-subtotal]')).toHaveText('£150');
  await drawer(page)
    .getByRole('radio', { name: /Rest of the world/ })
    .check();
  await drawer(page).getByRole('button', { name: 'Checkout' }).click();
  await expect(page).toHaveTitle('Stripe checkout');
  const [form] = shop.checkouts;
  expect(form.getAll('id')).toEqual(['gid://shopify/ProductVariant/2013']);
  expect(form.getAll('quantity')).toEqual(['2']);
  expect(form.get('delivery')).toBe('world');
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

test('the home page shows the three latest Instagram posts, each linking to its post', async ({
  page,
}) => {
  await page.goto('/');
  const band = page.locator('.ds-instagram');
  const posts = band.locator('.ds-instagram__photos a');
  await expect(posts).toHaveCount(3);
  await expect(posts.first()).toHaveAttribute('href', 'https://www.instagram.com/p/E2E1/');
  await expect(posts.first().locator('img')).toHaveAttribute(
    'alt',
    'Instagram post (1 November 2026): Studio day 1.',
  );
  await expect(posts.first().locator('img')).toHaveAttribute(
    'src',
    /^\/assets\/images\/instagram\/e2e1-320\.webp$/,
  );
  // Served from our own site, never from Instagram. (Lazy-loaded, so scroll to it first.)
  const img = posts.first().locator('img');
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
});
