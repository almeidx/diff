import { describe, expect, it } from "vitest";
import { compareVersions, defaultRange } from "./versions";

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

function info(versions: string[], latest?: string) {
	return { name: "pkg", latest, versions: versions.map((version) => ({ version, tags: [], downloadUrl: "" })) };
}

describe("defaultRange", () => {
	it("compares latest against the previous stable release, skipping prereleases", () => {
		expect(defaultRange(info(["3.0.0-rc.1", "2.1.0", "2.1.0-beta.1", "2.0.0"], "2.1.0"))).toEqual({
			from: "2.0.0",
			to: "2.1.0",
		});
	});

	it("falls back to the newest version and an older prerelease", () => {
		expect(defaultRange(info(["1.0.0-beta.2", "1.0.0-beta.1"]))).toEqual({ from: "1.0.0-beta.1", to: "1.0.0-beta.2" });
	});

	it("returns null when there is nothing to compare", () => {
		expect(defaultRange(info(["1.0.0"]))).toBeNull();
	});
});
