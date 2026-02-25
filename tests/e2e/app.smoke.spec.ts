import { expect, test } from "@playwright/test";

test("home page renders and core controls work", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { name: "Compare package versions" })).toBeVisible();
	await expect(page).toHaveTitle(/Diff/i);
	await expect(page.getByRole("button", { name: "npm" })).toBeVisible();
	await expect(page.getByRole("button", { name: "WordPress" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Toggle theme" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Load versions" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Compare versions" })).toBeVisible();
	await expect(page.locator('label[for="package-name"]')).toHaveText("Package name");
	await expect(page.locator("#package-name")).toHaveAttribute("placeholder", /lodash/i);
});

test("invalid compare URLs return error pages", async ({ page }) => {
	await page.goto("/npm/react");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("400");
	await expect(page.getByText("Invalid URL format. Expected: /npm/package/version1...version2")).toBeVisible();

	await page.goto("/wp/akismet/not-a-range");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("400");
	await expect(page.getByText("Invalid URL format. Expected: /wp/plugin-slug/version1...version2")).toBeVisible();
});
