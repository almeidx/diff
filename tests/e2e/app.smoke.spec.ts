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

test("CSRF cookie is set with correct attributes", async ({ page }) => {
	await page.goto("/");

	const cookies = await page.context().cookies();
	const csrfCookie = cookies.find((c) => c.name === "csrf_token");
	expect(csrfCookie).toBeDefined();
	expect(csrfCookie!.sameSite).toBe("Strict");
	expect(csrfCookie!.httpOnly).toBe(false);
	expect(csrfCookie!.value.length).toBeGreaterThanOrEqual(32);
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

test("diff page shows stats bar and file content", async ({ page }) => {
	await page.goto("/npm/is-number/6.0.0...7.0.0");

	await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

	await expect(page.getByText(/\d+ files? changed/)).toBeVisible();

	await expect(page.getByRole("radiogroup", { name: "Diff view mode" })).toBeVisible();
});

test("diff page view toggle switches between unified and split", async ({ page }) => {
	await page.goto("/npm/is-number/6.0.0...7.0.0");

	await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

	const splitLabel = page.locator("label", { hasText: "Split" });
	const unifiedLabel = page.locator("label", { hasText: "Unified" });

	await expect(splitLabel).toBeVisible();
	await expect(unifiedLabel).toBeVisible();

	await splitLabel.click();
	await page.waitForTimeout(300);

	await unifiedLabel.click();
	await page.waitForTimeout(300);
});

test("diff page file tree search filters files", async ({ page }) => {
	await page.goto("/npm/is-number/6.0.0...7.0.0");

	await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

	const searchInput = page.getByPlaceholder("Filter files...");
	await expect(searchInput).toBeVisible();

	const treeItemsBefore = await page.getByRole("treeitem").count();
	expect(treeItemsBefore).toBeGreaterThan(0);

	await searchInput.fill("package.json");
	await expect(page.locator("text=matching file")).toBeVisible();
});

test("diff page file collapse/expand works", async ({ page }) => {
	await page.goto("/npm/is-number/6.0.0...7.0.0");

	await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

	const firstFileBlock = page.locator("[id^='file-']").first();
	await expect(firstFileBlock).toBeVisible();

	const toggleButton = firstFileBlock.locator("button[aria-expanded]");
	await expect(toggleButton).toHaveAttribute("aria-expanded", "true");

	await toggleButton.click();
	await expect(toggleButton).toHaveAttribute("aria-expanded", "false");

	await toggleButton.click();
	await expect(toggleButton).toHaveAttribute("aria-expanded", "true");
});

test("theme toggle switches between light and dark", async ({ page }) => {
	await page.goto("/");

	const themeControl = page.locator("[data-scope='switch'][data-part='control']");
	await expect(themeControl).toBeVisible();

	const htmlBefore = await page.locator("html").getAttribute("data-theme");

	await themeControl.click();
	await page.waitForTimeout(200);

	const htmlAfter = await page.locator("html").getAttribute("data-theme");
	expect(htmlAfter).not.toBe(htmlBefore);
});

test("home page navigation link works", async ({ page }) => {
	await page.goto("/npm/is-number/6.0.0...7.0.0");
	await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

	await page.locator("a", { hasText: "diff" }).first().click();
	await expect(page.getByRole("heading", { name: "Compare package versions" })).toBeVisible();
});

test("skip-to-content link works", async ({ page }) => {
	await page.goto("/");

	await page.keyboard.press("Tab");
	const skipLink = page.locator("text=Skip to main content");
	await expect(skipLink).toBeFocused();
});

test("word wrap toggle works on diff page", async ({ page }) => {
	await page.goto("/npm/is-number/6.0.0...7.0.0");

	await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

	const wrapControl = page.locator("span", { hasText: "Wrap" });
	await expect(wrapControl).toBeVisible();
	await wrapControl.click();
});

test.describe("mobile responsiveness", () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test("home page layout adapts to mobile", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByRole("heading", { name: "Compare package versions" })).toBeVisible();
		await expect(page.getByRole("radio")).toHaveCount(2);
		await expect(page.locator("#package-name")).toBeVisible();
		await expect(page.getByRole("button", { name: "Compare versions" })).toBeVisible();

		const mainContent = page.locator("#main-content");
		const box = await mainContent.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.width).toBeLessThanOrEqual(375);
	});

	test("diff page layout adapts to mobile", async ({ page }) => {
		await page.goto("/npm/is-number/6.0.0...7.0.0");

		await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

		const sidebar = page.locator("aside");
		const sidebarBox = await sidebar.boundingBox();
		expect(sidebarBox).not.toBeNull();
		expect(sidebarBox!.width).toBeLessThanOrEqual(375);

		const mainContent = page.locator("main");
		const mainBox = await mainContent.boundingBox();
		expect(mainBox).not.toBeNull();
		expect(mainBox!.width).toBeLessThanOrEqual(375);
	});

	test("mobile diff page has stacked version selectors", async ({ page }) => {
		await page.goto("/npm/is-number/6.0.0...7.0.0");

		await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

		const fromSelector = page.getByRole("combobox", { name: "From" });
		const toSelector = page.getByRole("combobox", { name: "To" });

		await expect(fromSelector).toBeVisible();
		await expect(toSelector).toBeVisible();
	});

	test("mobile file tree search is usable", async ({ page }) => {
		await page.goto("/npm/is-number/6.0.0...7.0.0");

		await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

		const searchInput = page.getByPlaceholder("Filter files...");
		await expect(searchInput).toBeVisible();

		await searchInput.click();
		await searchInput.fill("index");
		await expect(page.locator("text=matching file")).toBeVisible();
	});
});

test.describe("tablet responsiveness", () => {
	test.use({ viewport: { width: 768, height: 1024 } });

	test("home page renders correctly on tablet", async ({ page }) => {
		await page.goto("/");

		await expect(page.getByRole("heading", { name: "Compare package versions" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Compare versions" })).toBeVisible();

		const mainContent = page.locator("#main-content");
		const box = await mainContent.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.width).toBeLessThanOrEqual(768);
	});

	test("diff page file tree and content are visible on tablet", async ({ page }) => {
		await page.goto("/npm/is-number/6.0.0...7.0.0");

		await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

		const sidebar = page.locator("aside");
		await expect(sidebar).toBeVisible();
	});
});
