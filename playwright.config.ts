import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "*.smoke.spec.ts",
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "retain-on-failure",
	},
	webServer: {
		// Build then serve the real static-asset server (wrangler dev, assets-only):
		// exercises prerendered /, SPA-shell 404 fallback and _headers deployment.
		command: "pnpm build && pnpm exec wrangler dev --port 4173",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
