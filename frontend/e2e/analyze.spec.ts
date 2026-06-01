import { test, expect } from '@playwright/test';

// Full user journey: connect a repository, wait for analysis, explore results.
// Requires the backend running with CODEGRAPH allowing the target repo.
test('connect a repository and view its health dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Codegraph' })).toBeVisible();

  await page.getByLabel('Repository URL').fill('https://github.com/trekhleb/javascript-algorithms');
  await page.getByRole('button', { name: /Analyze repository/ }).click();

  // Status badge appears and eventually reaches "completed".
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('completed', { timeout: 120000 });

  // The Churn tab shows ranked files by default.
  await expect(page.getByText('Churn')).toBeVisible();
  await page.getByRole('button', { name: 'Hotspots' }).click();
  await expect(page.getByTestId('hotspot-chart')).toBeVisible();

  await page.getByRole('button', { name: 'Coupling' }).click();
  await page.getByRole('button', { name: 'Ownership' }).click();
  await expect(page.getByText('Contributors')).toBeVisible();
});
