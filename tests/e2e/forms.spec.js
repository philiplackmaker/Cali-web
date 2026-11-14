// The Studio Letter signup (still posting to the Apps Script) and the enquiry form.
import { test, expect } from '@playwright/test';

const APPS_SCRIPT = 'https://script.google.com/macros/s/**';

test('Studio Letter: validates, posts the email to the Apps Script, says thanks', async ({
  page,
}) => {
  const posts = [];
  await page.route(APPS_SCRIPT, async (route) => {
    posts.push(route.request().postData());
    await route.fulfill({ status: 200, body: 'ok' });
  });
  await page.goto('/studio-letter/');
  const signup = page.locator('email-signup');
  await signup.getByRole('button', { name: 'Subscribe' }).click();
  await expect(signup.getByText('Enter your email address to sign up.')).toBeVisible();
  await signup.getByRole('textbox', { name: 'Email address' }).fill('not-an-email');
  await signup.getByRole('button', { name: 'Subscribe' }).click();
  await expect(signup.getByText('That doesn’t look like a valid email address.')).toBeVisible();
  expect(posts).toHaveLength(0);

  await signup.getByRole('textbox', { name: 'Email address' }).fill('collector@example.com');
  await signup.getByRole('button', { name: 'Subscribe' }).click();
  await expect(signup.getByText('You’re on the list.')).toBeVisible();
  await expect(signup.getByText('I’ll send the next one straight to your inbox.')).toBeVisible();
  expect(posts).toEqual(['email=collector%40example.com']);
});

test('the footer signup posts to the same Apps Script', async ({ page }) => {
  let posted = null;
  await page.route(APPS_SCRIPT, async (route) => {
    posted = route.request().postData();
    await route.fulfill({ status: 200, body: 'ok' });
  });
  await page.goto('/shop/');
  const footer = page.locator('footer email-signup');
  await footer.getByRole('textbox', { name: 'Email address' }).fill('hello@example.com');
  await footer.getByRole('button', { name: 'Subscribe' }).click();
  await expect(footer.getByText('You’re on the list.')).toBeVisible();
  expect(posted).toBe('email=hello%40example.com');
});

test('enquiry form: viewing links fill it in, and empty fields get friendly errors', async ({
  page,
}) => {
  await page.goto('/contact/?viewing=sun-hat-with-tulip');
  const form = page.locator('enquiry-form form');
  await expect(form.getByRole('combobox', { name: "What's it about?" })).toHaveValue('viewing');
  await expect(form.getByRole('combobox', { name: /Which painting/ })).toHaveValue(
    'sun-hat-with-tulip',
  );
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(form.getByText('Tell me your name, so I know who I’m writing to.')).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Your name' })).toBeFocused();
  await expect(page).toHaveURL(/\/contact\//);
});
