import { describe, expect, it } from "vitest";
import { compareVersions, parseVersionRange } from "./versions";

describe("compareVersions", () => {
	it("sorts prerelease tags before stable releases", () => {
		const versions = ["1.0.0", "1.0.0-beta.2", "1.0.1", "1.0.0-alpha", "1.0.0-beta.1"];
		const sorted = [...versions].sort(compareVersions);

		expect(sorted).toEqual(["1.0.0-alpha", "1.0.0-beta.1", "1.0.0-beta.2", "1.0.0", "1.0.1"]);
	});

	it("handles v prefixes and extended numeric segments", () => {
		expect(compareVersions("v1.2.3", "1.2.3")).toBe(0);
		expect(compareVersions("6.0.0.1", "6.0.0")).toBeGreaterThan(0);
	});
});

describe("parseVersionRange", () => {
	it("parses valid version ranges", () => {
		expect(parseVersionRange("1.0.0...2.0.0")).toEqual({
			fromVersion: "1.0.0",
			toVersion: "2.0.0",
		});
	});

	it("returns null for invalid ranges", () => {
		expect(parseVersionRange("1.0.0..2.0.0")).toBeNull();
	});
});
