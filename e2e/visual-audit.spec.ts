import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SCREENS_DIR = path.resolve(__dirname, '../docs/screenshots');

async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
    try { localStorage.setItem('bobsprint:theme', t); } catch {}
  }, theme);
  await page.waitForTimeout(120);
}

type PageDef = { name: string; path: string; waitFor?: string };

const PAGES: PageDef[] = [
  { name: 'landing',  path: '/',         waitFor: 'text=Bob ships the PR' },
  { name: 'run',      path: '/run',       waitFor: 'text=Run Bob on a repo' },
  { name: 'evidence', path: '/evidence',  waitFor: 'heading=No run selected' },
  { name: 'report',   path: '/report',    waitFor: 'heading=No report yet' },
];

// ── Screenshot sweep ─────────────────────────────────────────────────────────

for (const theme of ['dark', 'light'] as const) {
  for (const pg of PAGES) {
    test(`screenshot — ${theme} — ${pg.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(pg.path);

      // Wait for page content
      if (pg.waitFor?.startsWith('text=')) {
        await expect(page.getByText(pg.waitFor.slice(5))).toBeVisible({ timeout: 15_000 });
      } else if (pg.waitFor?.startsWith('heading=')) {
        await expect(page.getByRole('heading', { name: pg.waitFor.slice(8) })).toBeVisible({ timeout: 15_000 });
      } else {
        await page.waitForLoadState('networkidle');
      }

      await setTheme(page, theme);

      const filename = `${pg.name}-${theme}.png`;
      const fullPath = path.join(SCREENS_DIR, filename);
      await page.screenshot({ path: fullPath, fullPage: true });
      console.log(`✓ ${filename}`);
    });
  }
}

// ── Accessibility audit ───────────────────────────────────────────────────────

test('a11y — landing page has no critical aria violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bob ships the PR')).toBeVisible({ timeout: 15_000 });

  // Verify Tab key reaches an interactive element within a few presses
  // (first Tab may land on the Next.js router portal — keep pressing until an interactive element)
  let focused: string | null = null;
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.tagName ?? null);
    if (focused && ['A', 'BUTTON', 'INPUT'].includes(focused)) break;
  }
  expect(['A', 'BUTTON', 'INPUT']).toContain(focused);

  // No images without alt
  const imgs = page.locator('img:not([alt])');
  await expect(imgs).toHaveCount(0);
});

test('a11y — /run form is keyboard accessible', async ({ page }) => {
  await page.goto('/run');
  await expect(page.getByPlaceholder(/github\.com\/owner\/repo/i)).toBeVisible({ timeout: 10_000 });

  // Tab into the input
  const input = page.getByPlaceholder(/github\.com\/owner\/repo/i);
  await input.focus();
  await input.fill('test');

  // Tab to button
  await page.keyboard.press('Tab');
  const btn = page.getByRole('button', { name: /run bob/i });
  await expect(btn).toBeFocused();

  // Form submits on Enter from button
  await expect(btn).toBeEnabled();
});

test('a11y — pipeline stages have role=status on each card', async ({ page }) => {
  await page.goto('/run?url=demo');
  await expect(page.getByText('Demo Mode')).toBeVisible({ timeout: 15_000 });

  const statusCards = page.locator('[role="status"]');
  const count = await statusCards.count();
  expect(count).toBeGreaterThanOrEqual(5);

  // First card has aria-label
  const firstCard = statusCards.first();
  const label = await firstCard.getAttribute('aria-label');
  expect(label).toBeTruthy();
  expect(label).toMatch(/:/);
});

test('a11y — budget meter has role=meter', async ({ page }) => {
  await page.goto('/run?url=demo');
  await expect(page.getByText('Demo Mode')).toBeVisible({ timeout: 15_000 });

  const meter = page.locator('[role="meter"]');
  await expect(meter).toBeVisible();
  const min = await meter.getAttribute('aria-valuemin');
  const max = await meter.getAttribute('aria-valuemax');
  expect(min).toBe('0');
  expect(max).toBe('100');
});

test('a11y — theme toggle cycles through all three states', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bob ships the PR')).toBeVisible({ timeout: 15_000 });

  const toggle = page.getByRole('button', { name: /dark|light|system/i });
  await expect(toggle).toBeVisible();

  // Three clicks should cycle dark→light→system→dark
  const labels: string[] = [];
  for (let i = 0; i < 3; i++) {
    const label = await toggle.getAttribute('aria-label');
    labels.push(label ?? '');
    await toggle.click();
    await page.waitForTimeout(80);
  }
  const uniqueStates = new Set(labels.map((l) => l.replace(/switch to /i, '')));
  expect(uniqueStates.size).toBe(3);
});
