// Dark mode: follows the device, the header switch overrides it, and the choice sticks.
import { test, expect } from '@playwright/test';

const pageBg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const CREAM = 'rgb(248, 239, 229)'; // color.surface.page, light
const UMBER = 'rgb(30, 23, 20)'; // color.surface.page, dark (tokens/themes/dark.json)

test('follows the device: light or dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  expect(await pageBg(page)).toBe(UMBER);
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await pageBg(page)).toBe(CREAM);
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('the header switch picks dark, and it’s remembered on the next page', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Dark mode' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await pageBg(page)).toBe(UMBER);

  await page.goto('/shop/');
  expect(await pageBg(page)).toBe(UMBER);
  await expect(page.getByRole('button', { name: 'Dark mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Back to light: matches the device again, so it goes back to following the device.
  await page.getByRole('button', { name: 'Dark mode' }).click();
  expect(await pageBg(page)).toBe(CREAM);
  expect(await page.evaluate(() => localStorage.getItem('ds-theme'))).toBeNull();
});
