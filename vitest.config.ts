import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const appEnvStub = fileURLToPath(new URL("./tests/helpers/app-env.stub.ts", import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"$app/env": appEnvStub,
		},
	},
	test: {
		include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
		exclude: ["tests/e2e/**"],
	},
});
