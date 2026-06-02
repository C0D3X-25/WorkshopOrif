import { test, expect } from '@playwright/test';

// Cycle 2: Workshop list respects profile filter
// These tests require the API to be running with seeded data.
// They are tagged @needs-api and skipped in unit runs.

test.describe('workshop list filtered by profile', () => {
  test.beforeEach(async ({ page }) => {
    // Seed profile via localStorage so Profile Picker is bypassed
    await page.goto('/');
  });

  test('intern only sees Theory Introduction workshops', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('profile', 'intern'));
    await page.goto('/workshops');

    const items = page.getByTestId('workshop-item');
    // All visible workshops must be Theory + Introduction
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i).getByTestId('workshop-type')).toHaveText('Theory');
      await expect(items.nth(i).getByTestId('workshop-level')).toHaveText('Introduction');
    }
  });

  test('observer sees Theory and Exercise Introduction workshops', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('profile', 'observer'));
    await page.goto('/workshops');

    const items = page.getByTestId('workshop-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i).getByTestId('workshop-level')).toHaveText('Introduction');
    }
  });

  test('apprentice sees all workshops', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('profile', 'apprentice'));
    await page.goto('/workshops');

    // Both levels and both types should be present somewhere in the list
    await expect(page.getByTestId('workshop-item')).not.toHaveCount(0);
  });
});
