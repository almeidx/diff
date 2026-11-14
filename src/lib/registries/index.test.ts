import { describe, expect, it } from "vitest";
import { getPackage, type PackageInfo, type Registry } from "./index";

function fakeRegistry(id: string, responses: Array<PackageInfo | Error>): Registry & { calls: number } {
	return {
		id,
		label: id,
		icon: "",
		nameLabel: "Package",
		namePlaceholder: "",
		archiveFormat: "tgz",
		hosts: [],
		isValidName: () => true,
		search: async () => [],
		calls: 0,
		async fetchPackage() {
			const response = responses[this.calls++];
			if (response instanceof Error) throw response;
			return response;
		},
	};
}

function version(version: string) {
	return { version, tags: [], downloadUrl: `https://example.test/${version}.tgz` };
}

describe("getPackage", () => {
	it("sorts versions newest first and shares one request between callers", async () => {
		const registry = fakeRegistry("shared", [
			{ name: "pkg", versions: [version("1.0.0"), version("2.0.0-beta.1"), version("2.0.0"), version("1.10.0")] },
		]);

		const [first, second] = await Promise.all([getPackage(registry, "pkg"), getPackage(registry, "pkg")]);

		expect(first.versions.map((entry) => entry.version)).toEqual(["2.0.0", "2.0.0-beta.1", "1.10.0", "1.0.0"]);
		expect(second).toBe(first);
		expect(registry.calls).toBe(1);
	});

	it("refetches after a failure instead of caching it", async () => {
		const registry = fakeRegistry("retry", [new Error("offline"), { name: "pkg", versions: [version("1.0.0")] }]);

		await expect(getPackage(registry, "pkg")).rejects.toThrow("offline");
		await expect(getPackage(registry, "pkg")).resolves.toMatchObject({ name: "pkg" });
		expect(registry.calls).toBe(2);
	});
});
