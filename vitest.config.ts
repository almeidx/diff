import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const appEnvStub = fileURLToPath(new URL("./tests/helpers/app-env.stub.ts", import.meta.url));
const cloudflareWorkersStub = fileURLToPath(new URL("./tests/helpers/cloudflare-workers.stub.ts", import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"$app/env": appEnvStub,
			"cloudflare:workers": cloudflareWorkersStub,
		},
	},
	test: {
		include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
		exclude: ["tests/e2e/**"],
	},
});
