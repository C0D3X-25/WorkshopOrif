import { test, expect } from '@playwright/test';

const WORKSHOP_ID = '507f1f77bcf86cd799439011';

const BASE_WORKSHOP = {
  id: WORKSHOP_ID,
  title: 'Python Tools',
  description: 'Hands-on Python workshop',
  type: 1,
  level: 0,
  track: 'Formation',
  authors: [],
  prerequisites: [],
  maxConcurrentParticipants: 0,
  requiredMaterials: [],
  estimatedDuration: 90,
  expectedOutcome: '',
  date: '2026-01-01T00:00:00Z',
  chapters: [],
};

const SAMPLE_RUNTIME = {
  compose: 'services:\n  workshop:\n    image: python:3.11\n',
  devService: 'workshop',
  workspaceFiles: [{ name: 'main.py', content: 'print("hello")', gitUrl: null }],
};

test.describe('WorkshopDetail exercise runtime card', () => {
  test('shows exercise runtime card when exerciseRuntime is present', async ({ page }) => {
    await page.route(`/api/workshops/${WORKSHOP_ID}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...BASE_WORKSHOP,
          exerciseRuntime: SAMPLE_RUNTIME,
        }),
      });
    });

    await page.goto(`/workshops/${WORKSHOP_ID}`);

    await expect(page.getByTestId('docker-environment')).toBeVisible();
    await expect(page.getByTestId('docker-dev-service')).toContainText('workshop');
  });

  test('shows in-app confirmation when restarting exercise', async ({ page }) => {
    await page.route('**/companion/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    });

    await page.route('**/companion/containers/launch', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"phase":"starting"}\n\ndata: {"phase":"pulling"}\n\ndata: {"phase":"ready"}\n\n',
      });
    });

    await page.route(`/api/workshops/${WORKSHOP_ID}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...BASE_WORKSHOP,
          exerciseRuntime: {
            compose: 'services:\n  workshop:\n    image: python:3.11\n',
            devService: 'workshop',
            workspaceFiles: [],
          },
        }),
      });
    });

    await page.goto(`/workshops/${WORKSHOP_ID}`);
    await page.getByRole('button', { name: "Lancer l'exercice" }).click();
    await expect(page.getByRole('button', { name: "Recommencer l'exercice" })).toBeVisible();

    await page.getByRole('button', { name: "Recommencer l'exercice" }).click();
    const dialog = page.getByTestId('restart-confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('VS Code');
    await expect(dialog).toContainText('supprimés');

    await page.getByTestId('restart-confirm-cancel').click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: "Recommencer l'exercice" })).toBeVisible();
  });

  test('confirms restart via in-app dialog and calls companion reset', async ({ page }) => {
    let resetCalled = false;

    await page.route('**/companion/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    });

    await page.route('**/companion/containers/reset', async route => {
      resetCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, editorClosed: true }),
      });
    });

    let launchCount = 0;
    await page.route('**/companion/containers/launch', async route => {
      launchCount += 1;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'data: {"phase":"starting"}\n\ndata: {"phase":"pulling"}\n\ndata: {"phase":"ready"}\n\n',
      });
    });

    await page.route(`/api/workshops/${WORKSHOP_ID}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...BASE_WORKSHOP,
          exerciseRuntime: {
            compose: 'services:\n  workshop:\n    image: python:3.11\n',
            devService: 'workshop',
            workspaceFiles: [],
          },
        }),
      });
    });

    await page.goto(`/workshops/${WORKSHOP_ID}`);
    await page.getByRole('button', { name: "Lancer l'exercice" }).click();
    await page.getByRole('button', { name: "Recommencer l'exercice" }).click();
    await page.getByTestId('restart-confirm-submit').click();

    await expect.poll(() => resetCalled).toBe(true);
    expect(launchCount).toBe(2);
    await expect(page.getByTestId('restart-confirm-dialog')).not.toBeVisible();
    await expect(page.getByRole('button', { name: "Recommencer l'exercice" })).toBeVisible();
  });

  test('hides exercise runtime card when exerciseRuntime is absent', async ({ page }) => {
    await page.route(`/api/workshops/${WORKSHOP_ID}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(BASE_WORKSHOP),
      });
    });

    await page.goto(`/workshops/${WORKSHOP_ID}`);

    await expect(page.getByTestId('docker-environment')).not.toBeVisible();
  });
});
