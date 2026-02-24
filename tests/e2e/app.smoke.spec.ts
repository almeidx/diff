import { expect, test } from '@playwright/test';

test('home page renders and core controls work', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Compare package versions' })).toBeVisible();
	await expect(page).toHaveTitle(/Diff/i);
	await expect(page.locator('#package-name')).toHaveAttribute('placeholder', /lodash/i);

	const html = page.locator('html');
	const initialTheme = await html.getAttribute('data-theme');
	await page.getByRole('button', { name: 'Toggle theme' }).click();
	await expect
		.poll(async () => (await html.getAttribute('data-theme')) !== initialTheme)
		.toBe(true);
});

test('invalid compare URLs return error pages', async ({ page }) => {
	await page.goto('/npm/react');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('400');
	await expect(page.getByText('Invalid URL format. Expected: /npm/package/version1...version2')).toBeVisible();

	await page.goto('/wp/akismet/not-a-range');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('400');
	await expect(
		page.getByText('Invalid URL format. Expected: /wp/plugin-slug/version1...version2')
	).toBeVisible();
});
