import { test, expect } from '@playwright/test';

// End-to-end demo-mode flow. No Bob Bridge, no GitHub, fully deterministic.
// The Northpeak fixture replays all 5 stages with built-in delays (~15s).

test('demo run completes and produces a report + evidence trail', async ({ page }) => {
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[browser:error] ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  // 1. Land on /run and submit the demo URL via the form
  await page.goto('/run');
  await page.getByPlaceholder(/github\.com\/owner\/repo/i).fill('demo');
  await page.getByRole('button', { name: /run bob/i }).click();

  // 2. Pipeline view should appear with the DEMO badge
  await expect(page).toHaveURL(/\/run\?url=demo/);
  await expect(page.getByText('Demo Mode')).toBeVisible({ timeout: 15_000 });

  // 3. Wait for the pipeline to finish and auto-redirect to /report (~15s + 1.4s)
  await page.waitForURL(/\/report/, { timeout: 75_000 });

  // 4. Report card hero renders (hours saved display)
  await expect(page.getByText(/hours saved/i)).toBeVisible();

  // 5. Draft PR CTA link is present with the fixture URL
  const prLink = page.getByRole('link', { name: /open draft pull request/i });
  await expect(prLink).toBeVisible();
  await expect(prLink).toHaveAttribute(
    'href',
    'https://github.com/bobsprint-demo/proposal-studio/pull/1',
  );

  // 6. Applied and deferred sections visible
  await expect(page.getByText(/Applied \(3\)/i)).toBeVisible();
  await expect(page.getByText(/Deferred to human review/i)).toBeVisible();

  // 7. Evidence trail shows the full audit log (>= 5 entries)
  await page.goto('/evidence');
  await expect(page.getByRole('heading', { name: /evidence trail/i })).toBeVisible();
  await expect(page.getByText(/Recon complete/i).first()).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  const eventCountMatch = bodyText.match(/(\d+)\s+events/i);
  expect(eventCountMatch).not.toBeNull();
  expect(Number(eventCountMatch![1])).toBeGreaterThanOrEqual(5);
});
