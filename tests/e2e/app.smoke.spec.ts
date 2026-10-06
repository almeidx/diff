import { expect, test } from "@playwright/test";

test("home page renders with hardened headers and accessible controls", async ({ page }) => {
	// "/" is prerendered; security headers come from static/_headers deployed via wrangler.
	const response = await page.goto("/");

	expect(response).not.toBeNull();
	expect(response!.status()).toBe(200);
	const headers = response!.headers();
	expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
	expect(headers["x-content-type-options"]).toBe("nosniff");
	expect(headers["x-frame-options"]).toBe("DENY");
	expect(headers["permissions-policy"]).toContain("camera=()");
	expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");

	// Kit's script CSP is emitted as a <meta> tag on the document itself.
	const kitCspMeta = page.locator('meta[http-equiv="Content-Security-Policy"]');
	await expect(kitCspMeta).toHaveCount(1);
	expect(await kitCspMeta.getAttribute("content")).toContain("default-src 'self'");

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
	// The button is enabled once the client bundle has hydrated.
	await expect(page.getByRole("button", { name: "Load versions" })).toBeEnabled();
	await page.getByRole("button", { name: "Load versions" }).click();

	// Versions are fetched through the Web Worker; an aria-live region announces completion.
	await expect(page.locator("[aria-live]").filter({ hasText: /Loaded \d+ versions/ })).toBeVisible({ timeout: 30_000 });

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
	// Wait for hydration: the "Load versions" button becomes enabled once Svelte's reactive bindings are active
	await expect(page.getByRole("button", { name: "Load versions" })).toBeEnabled();
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
	// Deep links are served the SPA shell with HTTP 404; the error UI renders client-side.
	const response = await page.goto("/npm/react");
	expect(response!.status()).toBe(404);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("400");
	await expect(page.getByText("Invalid URL format. Expected: /npm/package/version1...version2")).toBeVisible();

	const wpResponse = await page.goto("/wp/akismet/not-a-range");
	expect(wpResponse!.status()).toBe(404);
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

test("selecting a file in the tree scrolls its diff into view", async ({ page }) => {
	await page.goto("/npm/is-number/6.0.0...7.0.0");

	await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

	const lastFileBlock = page.locator("#file-README-md");
	await expect(lastFileBlock).toBeVisible();
	await expect(lastFileBlock).not.toBeInViewport();

	const treeItem = page.getByRole("treeitem", { name: "README.md" });
	await treeItem.click();

	await expect(treeItem).toHaveAttribute("aria-selected", "true");
	await expect(lastFileBlock).toBeInViewport({ timeout: 15_000 });
});

test("expanding a collapsed region loads surrounding context", async ({ page }) => {
	// chalk 4.1.2...5.0.0 has expandable hunks (ms 2.1.2...2.1.3 does not).
	await page.goto("/npm/chalk/4.1.2...5.0.0");

	await expect(page.getByRole("tree", { name: "Changed files tree" })).toBeVisible({ timeout: 30_000 });

	const fileBlock = page
		.locator("[id^='file-']")
		.filter({ has: page.locator("[data-expand-button]") })
		.first();
	await expect(fileBlock).toBeVisible({ timeout: 30_000 });

	const renderedLines = fileBlock.locator("[data-line-index]");
	await expect(renderedLines.first()).toBeAttached({ timeout: 30_000 });

	const linesBefore = await renderedLines.count();
	expect(linesBefore).toBeGreaterThan(0);

	const expandButton = fileBlock.locator("[data-expand-button]").first();
	await expect(expandButton).toBeVisible();

	// Expansion loads surrounding context via the worker RPC (no /api routes anymore).
	await expandButton.click();

	await expect.poll(async () => renderedLines.count(), { timeout: 15_000 }).toBeGreaterThan(linesBefore);
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
	// Wait for all JS modules to load and hydration to complete
	await page.waitForLoadState("networkidle");

	const themeControl = page.locator("[data-scope='switch'][data-part='control']");
	await expect(themeControl).toBeVisible();

	const htmlBefore = await page.locator("html").getAttribute("data-theme");

	await themeControl.click();
	await expect(page.locator("html")).not.toHaveAttribute("data-theme", htmlBefore!);
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
