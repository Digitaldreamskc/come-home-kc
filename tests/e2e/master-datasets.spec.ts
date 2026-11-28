import { expect, test } from '@playwright/test';
import { sectors } from '../../lib/sector-taxonomy';

test('Capital Landscape and Atlas read the same profiles and sector options', async ({ page }) => {
  await page.goto('/regional-intelligence/capital');
  const landscape = page.locator('article').filter({ has: page.getByRole('heading', { name: 'AltCap', exact: true }) });
  await expect(landscape.getByRole('link', { name: 'Visit website' })).toHaveAttribute('href', /altcap\.org/);
  await page.getByRole('button', { name: /Documented sector/ }).click();
  await expect(page.getByRole('group', { name: 'Choose sectors' }).getByRole('checkbox')).toHaveCount(sectors.length);
  await page.getByRole('searchbox', { name: 'Search sectors' }).fill('health');
  await page.getByRole('checkbox', { name: 'Healthcare' }).check();
  await page.getByRole('searchbox', { name: 'Search sectors' }).fill('industrial');
  await page.getByRole('checkbox', { name: 'Industrials' }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('button', { name: /2 sectors selected/ })).toBeVisible();

  await page.goto('/atlas#providers');
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: '22 matching providers' })).toBeVisible();
  const alphabet = page.getByRole('group', { name: 'Browse providers by letter' });
  await expect(alphabet.getByRole('button', { name: 'A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.capital-profile-card')).toHaveCount(1);
  await alphabet.getByRole('button', { name: 'B', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'B12 Capital Partners', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AltCap', exact: true })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search capital providers' }).fill('AltCap');
  await expect(alphabet.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const atlas = page.locator('article').filter({ has: page.getByRole('heading', { name: 'AltCap', exact: true }) });
  await expect(atlas.getByRole('link', { name: 'Visit website' })).toHaveAttribute('href', /altcap\.org/);
  await page.getByRole('searchbox', { name: 'Search capital providers' }).clear();
  await page.getByText('Documented sector', { exact: true }).click();
  await expect(page.getByRole('group', { name: 'Choose sectors' }).getByRole('checkbox')).toHaveCount(sectors.length);
  await page.getByRole('searchbox', { name: 'Search sectors' }).fill('health');
  await page.getByRole('checkbox', { name: 'Healthcare' }).check();
  await page.getByRole('searchbox', { name: 'Search sectors' }).fill('industrial');
  await page.getByRole('checkbox', { name: 'Industrials' }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByText('(2 selected)')).toBeVisible();
});

test('ecosystem listing and intake are usable on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/regional-intelligence/ecosystem');
  await expect(page.getByRole('heading', { name: 'AltCap', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Add your profile' }).click();
  await expect(page.getByRole('heading', { name: 'Add your resource partner profile' })).toBeVisible();
  await page.getByRole('button', { name: /Documented sector specialties/ }).click();
  await expect(page.getByRole('group', { name: 'Choose sectors' }).getByRole('checkbox')).toHaveCount(sectors.length);
  await page.getByRole('searchbox', { name: 'Search sectors' }).press('Escape');
  await expect(page.getByRole('button', { name: /Documented sector specialties/ })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('anonymous users are sent to sign-in for staff queues', async ({ page }) => {
  for (const path of ['/admin/ecosystem-applications','/admin/organization-identities','/partnerships?view=follow-ups']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
});
