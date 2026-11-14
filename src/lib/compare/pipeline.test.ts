import { afterEach, describe, expect, it, vi } from "vitest";
import type { Registry } from "#lib/registries/index.js";
import { runCompare } from "./pipeline";

const registry: Registry = {
	id: "pipeline-test",
	label: "Test",
	icon: "",
	nameLabel: "Package",
	namePlaceholder: "",
	archiveFormat: "tgz",
	hosts: ["example.test"],
	isValidName: () => true,
	search: async () => [],
	fetchPackage: async () => ({
		name: "pkg",
		versions: ["1.0.0", "2.0.0"].map((version) => ({
			version,
			tags: [],
			downloadUrl: `https://example.test/pkg-${version}.tgz`,
		})),
	}),
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("runCompare", () => {
	it("cancels the other download once one side fails", async () => {
		const signals = new Map<string, AbortSignal>();
		vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
			signals.set(url.pathname, init.signal!);
			if (url.pathname === "/pkg-2.0.0.tgz") return new Response(null, { status: 500 });
			return new Response(new ReadableStream());
		});

		const request = { registry: registry.id, name: "pkg", from: "1.0.0", to: "2.0.0", unlimited: false };
		await expect(runCompare(registry, request, () => {}, new AbortController().signal)).rejects.toThrow(
			"Downloading 2.0.0 failed with status 500.",
		);
		expect(signals.get("/pkg-1.0.0.tgz")?.aborted).toBe(true);
	});
});
