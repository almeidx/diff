import { expect, test, type Page } from "@playwright/test";
import { gzipSync, strToU8 } from "fflate";

/** Gzipped ustar archive, wrapped in `package/` like `npm pack` output. */
function tgz(files: Record<string, string>): Buffer {
	const entries = Object.entries(files);
	const tar = new Uint8Array(
		entries.reduce((sum, [, body]) => sum + 512 + Math.ceil(strToU8(body).length / 512) * 512, 1024),
	);
	let offset = 0;
	for (const [name, body] of entries) {
		const bytes = strToU8(body);
		tar.set(strToU8(`package/${name}`), offset);
		tar.set(strToU8(bytes.length.toString(8).padStart(11, "0") + " "), offset + 124);
		tar[offset + 156] = 48;
		tar.set(bytes, offset + 512);
		offset += 512 + Math.ceil(bytes.length / 512) * 512;
	}
	return Buffer.from(gzipSync(tar));
}

const releases: Record<string, Record<string, string>> = {
	"1.0.0": {
		"package.json": '{\n  "name": "demo-pkg",\n  "version": "1.0.0"\n}\n',
		"lib/index.js": "export function greet() {\n\treturn 'hello';\n}\n",
		"lib/old.js": "export const removed = true;\n",
	},
	"2.0.0": {
		"package.json": '{\n  "name": "demo-pkg",\n  "version": "2.0.0"\n}\n',
		"lib/index.js": "export function greet(name) {\n\treturn `hello ${name}`;\n}\n",
		"lib/new.js": "export const added = true;\n",
		"dist/bundle.min.js": "!function(){console.log(1)}();\n",
	},
};

/** Serves a fake `demo-pkg` from the npm registry so diff pages are deterministic and offline. */
async function mockRegistry(page: Page, packageName = "demo-pkg", archives = releases) {
	const versions = Object.fromEntries(
		Object.keys(archives).map((version) => [
			version,
			{ dist: { tarball: `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz` } },
		]),
	);
	await page.route(`https://registry.npmjs.org/${packageName}`, (route) =>
		route.fulfill({
			json: {
				name: packageName,
				"dist-tags": { latest: "2.0.0" },
				time: { "1.0.0": "2024-01-01T00:00:00Z", "2.0.0": "2024-06-01T00:00:00Z" },
				versions,
			},
		}),
	);
	await page.route(`https://registry.npmjs.org/${packageName}/-/*.tgz`, (route) => {
		const version = route
			.request()
			.url()
			.match(/-(\d+\.\d+\.\d+)\.tgz$/)![1];
		return route.fulfill({ body: tgz(archives[version]), contentType: "application/octet-stream" });
	});
	await page.route("https://registry.npmjs.org/-/v1/search?*", (route) =>
		route.fulfill({
			json: { objects: [{ package: { name: packageName, version: "2.0.0", description: "A demo package" } }] },
		}),
	);
}

test("home page is prerendered with hardened headers and a CSP that allows the WASM highlighter", async ({ page }) => {
	const response = await page.goto("/");
	expect(response!.status()).toBe(200);
	const headers = response!.headers();
	expect(headers["x-frame-options"]).toBe("DENY");
	expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");

	const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
	expect(csp).toContain("default-src 'self'");
	expect(csp).toContain("'wasm-unsafe-eval'");
	expect(csp).toContain("https://registry.npmjs.org");

	await expect(page.getByRole("heading", { name: "Compare package releases" })).toBeVisible();
	await expect(page.getByRole("radio")).toHaveCount(2);
});

test("picking a package, versions and comparing opens the diff", async ({ page }) => {
	await mockRegistry(page);
	await page.goto("/");

	const packageInput = page.getByRole("combobox", { name: "Package" });
	await packageInput.click();
	await packageInput.pressSequentially("demo");
	await page.getByRole("option", { name: /demo-pkg/ }).click();

	await expect(page.getByRole("combobox", { name: "From" })).toHaveValue("1.0.0");
	await expect(page.getByRole("combobox", { name: "To" })).toHaveValue("2.0.0");

	await page.getByRole("button", { name: "Swap versions" }).click();
	await expect(page.getByRole("combobox", { name: "From" })).toHaveValue("2.0.0");
	await page.getByRole("button", { name: "Swap versions" }).click();

	await page.getByRole("button", { name: /Compare 1\.0\.0/ }).click();
	await expect(page).toHaveURL(/\/npm\/demo-pkg\/1\.0\.0\.\.\.2\.0\.0$/);
	await expect(page.getByRole("tree", { name: "Changed files" })).toBeVisible();
});

test("WordPress switches the name field to plugins", async ({ page }) => {
	await page.goto("/");
	await page.locator("label", { hasText: "WordPress" }).click();
	await expect(page.getByRole("radio", { name: "WordPress" })).toBeChecked();
	await expect(page.getByRole("combobox", { name: "Plugin" })).toHaveAttribute("placeholder", /akismet/);
});

test("diff page lists changes in tree order and renders each diff", async ({ page }) => {
	await mockRegistry(page);
	await page.goto("/npm/demo-pkg/1.0.0...2.0.0");

	const tree = page.getByRole("tree", { name: "Changed files" });
	await expect(tree).toBeVisible();
	await expect(page.getByText("5 files")).toBeVisible();

	const titles = page.locator("diffs-container").locator("[data-title]");
	await expect(titles.first()).toHaveText("dist/bundle.min.js");
	await expect(page.locator("diffs-container [data-title]", { hasText: "lib/index.js" })).toBeVisible();

	// Minified bundles start collapsed behind an expand toggle.
	await expect(page.getByRole("button", { name: "Expand dist/bundle.min.js" })).toBeVisible();
});

test("selecting a file in the tree scrolls the diff to it", async ({ page }) => {
	await mockRegistry(page);
	await page.goto("/npm/demo-pkg/1.0.0...2.0.0");

	await page.getByRole("treeitem", { name: /package\.json/ }).click();
	await expect(page.locator("diffs-container [data-title]", { hasText: "package.json" })).toBeInViewport();
});

test("layout and wrap preferences persist across reloads", async ({ page }) => {
	await mockRegistry(page);
	await page.goto("/npm/demo-pkg/1.0.0...2.0.0");

	await page.getByRole("radio", { name: "Unified" }).click();
	await page.getByRole("button", { name: "Wrap" }).click();
	await page.reload();

	await expect(page.getByRole("radio", { name: "Unified" })).toHaveAttribute("aria-checked", "true");
	await expect(page.getByRole("button", { name: "Wrap" })).toHaveAttribute("aria-pressed", "true");
});

test("theme toggle flips and persists the theme", async ({ page }) => {
	await page.goto("/");
	const before = await page.locator("html").getAttribute("data-theme");
	await page.getByRole("button", { name: /Switch to (light|dark) theme/ }).click();
	await expect(page.locator("html")).not.toHaveAttribute("data-theme", before!);
	await page.reload();
	await expect(page.locator("html")).not.toHaveAttribute("data-theme", before!);
});

test("unknown versions and malformed links explain what went wrong", async ({ page }) => {
	await mockRegistry(page);
	await page.goto("/npm/demo-pkg/1.0.0...9.9.9");
	await expect(page.getByRole("alert")).toContainText('Version 9.9.9 of "demo-pkg" does not exist.');

	const response = await page.goto("/npm/react");
	expect(response!.status()).toBe(404);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("400");

	await page.goto("/nope/react/1...2");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("404");
});

test("oversized packages offer an explicit bypass that reruns without limits", async ({ page }) => {
	// 10,001 identical files trip the default file-count cap while keeping the rerun cheap.
	const files = Object.fromEntries(Array.from({ length: 10_001 }, (_, i) => [`src/file-${i}.txt`, "same\n"]));
	await mockRegistry(page, "limit-pkg", { "1.0.0": files, "2.0.0": files });

	await page.goto("/npm/limit-pkg/1.0.0...2.0.0");
	await expect(page.getByRole("heading", { name: "This package is too large" })).toBeVisible({ timeout: 30_000 });

	await page.getByRole("link", { name: "Compare without limits" }).click();
	await expect(page).toHaveURL(/limits=off/);
	await expect(page.getByRole("heading", { name: "No differences" })).toBeVisible({ timeout: 30_000 });
});

test.describe("mobile", () => {
	test.use({ viewport: { width: 375, height: 812 } });

	test("picker fits the viewport and the diff stays readable without the tree", async ({ page }) => {
		await mockRegistry(page);
		await page.goto("/");
		const form = await page.locator("form").boundingBox();
		expect(form!.x).toBeGreaterThanOrEqual(0);
		expect(form!.x + form!.width).toBeLessThanOrEqual(375);

		await page.goto("/npm/demo-pkg/1.0.0...2.0.0");
		await expect(page.locator("diffs-container").first()).toBeVisible();
		await expect(page.getByRole("tree", { name: "Changed files" })).toBeHidden();
	});
});
