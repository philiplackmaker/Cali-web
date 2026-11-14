// Video clips: play while on screen, pause button (WCAG 2.2.2), reduced motion waits.
// Uses the design-system page, which shows the component with a sample clip.
import { test, expect } from '@playwright/test';

const URL = '/design-system/components/video-clip/';

test('a clip plays on its own, silently, and the button pauses it', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Playwright’s Firefox has no H.264 decoder');
  await page.goto(URL);
  const clip = page.locator('video-clip').first();
  await clip.scrollIntoViewIfNeeded();
  const video = clip.locator('video');
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('controls', false);
  await expect.poll(() => video.evaluate((v) => !v.paused)).toBe(true);

  await clip.getByRole('button', { name: 'Pause clip' }).click();
  await expect.poll(() => video.evaluate((v) => v.paused)).toBe(true);
  await expect(clip.getByRole('button', { name: 'Play clip' })).toBeVisible();
});

test('reduce motion: the clip waits for Play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  const clip = page.locator('video-clip').first();
  await clip.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(await clip.locator('video').evaluate((v) => v.paused)).toBe(true);
  await expect(clip.getByRole('button', { name: 'Play clip' })).toBeVisible();
});

test('no JS: the browser’s own controls show', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(URL);
  await expect(page.locator('video-clip video').first()).toHaveAttribute('controls', '');
  await expect(page.locator('video-clip button').first()).toBeHidden();
  await context.close();
});

test('overlay (the hero): starts after the page loads and fades in over the painting', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'firefox', 'Playwright’s Firefox has no H.264 decoder');
  await page.goto(URL);
  const clip = page.locator('[data-overlay-demo] video-clip');
  await clip.scrollIntoViewIfNeeded();
  const video = clip.locator('video');
  await expect.poll(() => video.evaluate((v) => !v.paused)).toBe(true);
  await expect.poll(() => video.evaluate((v) => getComputedStyle(v).opacity)).toBe('1');
  // Pausing leaves the frame showing, not the painting.
  await clip.getByRole('button', { name: 'Pause clip' }).click();
  await expect(clip).toHaveAttribute('data-started', '');
  expect(await video.evaluate((v) => getComputedStyle(v).opacity)).toBe('1');
});

test('overlay with reduce motion: the painting stays, with a Play button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  const clip = page.locator('[data-overlay-demo] video-clip');
  await clip.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(await clip.locator('video').evaluate((v) => v.paused)).toBe(true);
  expect(await clip.locator('video').evaluate((v) => getComputedStyle(v).opacity)).toBe('0');
  await expect(clip.getByRole('button', { name: 'Play clip' })).toBeVisible();
});
