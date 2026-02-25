import { expect, test } from "@playwright/test";

test("home page renders with hardened headers and accessible controls", async ({ page }) => {
	const response = await page.goto("/");

	expect(response).not.toBeNull();
	const headers = response!.headers();
	expect(headers["content-security-policy"]).toContain("default-src 'self'");
	expect(headers["x-content-type-options"]).toBe("nosniff");
	expect(headers["x-frame-options"]).toBe("DENY");

	await expect(page.getByRole("heading", { name: "Compare package versions" })).toBeVisible();
	await expect(page).toHaveTitle(/Diff/i);
	await expect(page.getByRole("radio")).toHaveCount(2);
	await expect(page.getByRole("checkbox").first()).toBeVisible();
	await expect(page.getByRole("button", { name: "Load versions" })).toBeDisabled();
	await expect(page.getByRole("button", { name: "Compare versions" })).toBeVisible();
	await expect(page.locator("label", { hasText: "Package name" })).toBeVisible();
	await expect(page.locator("#package-name")).toHaveAttribute("placeholder", /lodash/i);
});

test("package type radios update the form labels", async ({ page }) => {
	await page.goto("/");

	const npmRadio = page.getByRole("radio").nth(0);
	const wordpressRadio = page.getByRole("radio").nth(1);

	await expect(npmRadio).toBeChecked();
	await npmRadio.focus();
	await page.keyboard.press("ArrowRight");
	await expect(wordpressRadio).toBeChecked();
});

test("version fetch flow exposes combobox selectors", async ({ page }) => {
	await page.goto("/");

	await page.locator("#package-name").fill("lodash");
	await page.getByRole("button", { name: "Load versions" }).click();

	const fromCombobox = page.getByRole("combobox", { name: "From version" });
	const toCombobox = page.getByRole("combobox", { name: "To version" });

	await expect(fromCombobox).toBeVisible();
	await expect(toCombobox).toBeVisible();
	await expect(fromCombobox).not.toHaveValue("");
	await expect(toCombobox).not.toHaveValue("");
});

test("form validation errors are announced", async ({ page }) => {
	await page.goto("/");

	await page.locator("#package-name").fill("lodash");
	await page.getByRole("button", { name: "Compare versions" }).click();
	await expect(page.getByRole("alert")).toContainText("Please enter both versions");
});

test("diff page exposes keyboard-accessible file tree", async ({ page }) => {
	await page.goto("/npm/is-number/6.0.0...7.0.0");

	const tree = page.getByRole("tree", { name: "Changed files tree" });
	await expect(tree).toBeVisible({ timeout: 30_000 });
	await expect(page.getByRole("treeitem").first()).toBeVisible();

	const firstTreeItem = page.getByRole("treeitem").first();
	await firstTreeItem.focus();
	await expect(firstTreeItem).toBeFocused();
	await page.keyboard.press("ArrowDown");
	await expect(tree).toBeVisible();
});

test("invalid compare URLs return error pages", async ({ page }) => {
	await page.goto("/npm/react");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("400");
	await expect(page.getByText("Invalid URL format. Expected: /npm/package/version1...version2")).toBeVisible();

	await page.goto("/wp/akismet/not-a-range");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("400");
	await expect(page.getByText("Invalid URL format. Expected: /wp/plugin-slug/version1...version2")).toBeVisible();
});
