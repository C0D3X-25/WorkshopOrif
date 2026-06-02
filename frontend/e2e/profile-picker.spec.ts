import { test, expect } from '@playwright/test';

// Cycle 1: Profile Picker — three cards visible, selection persists in localStorage

test('profile picker shows three profile cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('profile-card-intern')).toBeVisible();
  await expect(page.getByTestId('profile-card-observer')).toBeVisible();
  await expect(page.getByTestId('profile-card-apprentice')).toBeVisible();
});

test('selecting a profile persists to localStorage', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('profile-card-apprentice').click();

  const stored = await page.evaluate(() => localStorage.getItem('profile'));
  expect(stored).toBe('apprentice');
});

test('returning to the app restores previously selected profile', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('profile', 'observer'));

  await page.reload();

  // Profile picker should not be shown; workshops page for observer is visible
  await expect(page.getByTestId('profile-card-intern')).not.toBeVisible();
  await expect(page.getByTestId('workshop-list')).toBeVisible();
});
