import { afterEach, describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";
import { fetchAndExtract } from "./extractor";

describe("fetchAndExtract zip", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("streams text files from zip archives and strips a shared plugin root", async () => {
		const archive = zipSync({
			"plugin-name/plugin.php": strToU8("<?php\n"),
			"plugin-name/includes/main.php": strToU8("<?php\nrequire_once 'plugin.php';\n"),
			"plugin-name/assets/icon.png": new Uint8Array([0, 0, 1]),
			"plugin-name/binary-looking.txt": new Uint8Array([65, 0, 66, 0]),
		});

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(archive)),
		);

		const tree = await fetchAndExtract("https://downloads.wordpress.org/plugin/plugin-name.zip", "zip");

		expect([...tree.files.keys()].sort()).toEqual(["includes/main.php", "plugin.php"]);
		expect(tree.files.get("plugin.php")?.content).toBe("<?php\n");
		expect(tree.files.get("includes/main.php")?.content).toContain("require_once");
	});

	it("keeps zip root paths when entries are mixed at top level", async () => {
		const archive = zipSync({
			"plugin-name/plugin.php": strToU8("<?php\n"),
			"readme.txt": strToU8("Plugin readme\n"),
		});

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(archive)),
		);

		const tree = await fetchAndExtract("https://downloads.wordpress.org/plugin/plugin-name.zip", "zip");

		expect([...tree.files.keys()].sort()).toEqual(["plugin-name/plugin.php", "readme.txt"]);
	});
});
