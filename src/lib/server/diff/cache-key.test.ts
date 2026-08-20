import { describe, expect, it } from "vitest";
import { buildDiffCacheKey } from "./cache-key";

describe("buildDiffCacheKey", () => {
	it("namespaces keys by registry, package, and both versions", () => {
		expect(buildDiffCacheKey("npm", "lodash", "4.17.20", "4.17.21")).toBe("diff:v3:npm:lodash:4.17.20:4.17.21");
		expect(buildDiffCacheKey("wp", "akismet", "5.0", "5.1")).toBe("diff:v3:wp:akismet:5.0:5.1");
	});

	it("keeps scoped package names intact", () => {
		expect(buildDiffCacheKey("npm", "@types/node", "26.1.2", "26.2.0")).toBe("diff:v3:npm:@types/node:26.1.2:26.2.0");
	});

	it("distinguishes registries that share a package name", () => {
		expect(buildDiffCacheKey("npm", "shared", "1.0.0", "2.0.0")).not.toBe(
			buildDiffCacheKey("wp", "shared", "1.0.0", "2.0.0"),
		);
	});
});
