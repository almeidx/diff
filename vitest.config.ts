import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const libDir = fileURLToPath(new URL("./src/lib", import.meta.url));
const appEnvironmentStub = fileURLToPath(new URL("./tests/helpers/app-environment.stub.ts", import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			$lib: libDir,
			"$app/environment": appEnvironmentStub,
		},
	},
	test: {
		include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
		exclude: ["tests/e2e/**"],
	},
});
