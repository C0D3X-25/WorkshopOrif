import { test, expect } from '@playwright/test';

// Cycle 3: Admin login

test('correct password redirects to /admin', async ({ page }) => {
  await page.goto('/admin/login');

  await page.getByTestId('admin-password-input').fill('correct-password');
  await page.getByTestId('admin-login-submit').click();

  await expect(page).toHaveURL('/admin');
});

test('wrong password shows error message', async ({ page }) => {
  await page.goto('/admin/login');

  await page.getByTestId('admin-password-input').fill('wrong-password');
  await page.getByTestId('admin-login-submit').click();

  await expect(page.getByTestId('admin-login-error')).toBeVisible();
  await expect(page).toHaveURL('/admin/login');
});

test('/admin redirects to /admin/login when not authenticated', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL('/admin/login');
});
