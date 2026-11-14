import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { AppError } from "#lib/errors.js";
import { tgz as buildTgz, type TarInput } from "../../../tests/helpers/tar.js";
import { extractArchive } from "./extract";
import { DEFAULT_LIMITS, NO_LIMITS, type ArchiveLimits } from "./limits";

function tgz(entries: TarInput[]): Response {
	return new Response(new Uint8Array(buildTgz(entries)));
}

function zip(files: Parameters<typeof zipSync>[0]): Response {
	return new Response(new Uint8Array(zipSync(files)));
}

function only(overrides: Partial<ArchiveLimits>): ArchiveLimits {
	return { ...NO_LIMITS, ...overrides };
}

describe("extractArchive tgz", () => {
	it("strips the wrapper directory npm packs, whatever it is named", async () => {
		const files = await extractArchive(
			tgz([
				{ name: "node/index.d.ts", content: "export {};\n" },
				{ name: "node/lib/fs.d.ts", content: "declare module 'fs';\n" },
			]),
			"tgz",
			DEFAULT_LIMITS,
		);

		expect([...files.keys()]).toEqual(["index.d.ts", "lib/fs.d.ts"]);
		expect(files.get("index.d.ts")).toEqual({ kind: "text", size: 11, content: "export {};\n" });
	});

	it("uses PAX path records for names longer than the header field", async () => {
		const longPath = `package/${"deep/".repeat(30)}file.js`;
		const pax = `${longPath.length + 7 + String(longPath.length + 7).length} path=${longPath}\n`;
		const files = await extractArchive(
			tgz([
				{ name: "PaxHeader", content: pax, type: "x" },
				{ name: longPath.slice(0, 100), content: "ok\n" },
				{ name: "package/index.js", content: "x\n" },
			]),
			"tgz",
			DEFAULT_LIMITS,
		);

		expect(files.get(longPath.slice("package/".length))?.kind).toBe("text");
	});

	it("records binary content and excluded paths without diffing them", async () => {
		const files = await extractArchive(
			tgz([
				{ name: "package/data.txt", content: new Uint8Array([65, 0, 66, 0, 67]) },
				{ name: "package/node_modules/dep/index.js", content: "dep\n" },
				{ name: "package/index.js", content: "x\n" },
			]),
			"tgz",
			DEFAULT_LIMITS,
		);

		expect(files.get("data.txt")).toMatchObject({ kind: "binary", size: 5, digest: expect.any(String) });
		expect(files.has("node_modules/dep/index.js")).toBe(false);
	});

	it("rejects with a limit error once decompressed bytes exceed the cap", async () => {
		const extraction = extractArchive(
			tgz([{ name: "package/index.js", content: "export const value = 1;\n" }]),
			"tgz",
			only({ decompressedSize: 64 }),
		);
		await expect(extraction).rejects.toMatchObject({ code: "limit" });
	});
});

describe("extractArchive zip", () => {
	it("strips the plugin directory and records binary files without inflating them", async () => {
		const files = await extractArchive(
			zip({
				"plugin/plugin.php": strToU8("<?php\n"),
				"plugin/assets/icon.png": new Uint8Array([137, 80, 78, 71]),
			}),
			"zip",
			DEFAULT_LIMITS,
		);

		expect(files.get("plugin.php")).toEqual({ kind: "text", size: 6, content: "<?php\n" });
		expect(files.get("assets/icon.png")).toEqual({ kind: "binary", size: 4, digest: null });
	});

	it("keeps paths when entries do not share one root", async () => {
		const files = await extractArchive(
			zip({ "plugin/plugin.php": strToU8("<?php\n"), "readme.txt": strToU8("hi\n") }),
			"zip",
			DEFAULT_LIMITS,
		);
		expect([...files.keys()].sort()).toEqual(["plugin/plugin.php", "readme.txt"]);
	});

	it("marks oversized text files as too large instead of failing", async () => {
		const files = await extractArchive(
			zip({ "plugin/big.php": [strToU8("x".repeat(64)), { level: 0 }], "plugin/a.php": strToU8("a") }),
			"zip",
			only({ fileSize: 10 }),
		);
		expect(files.get("big.php")).toEqual({ kind: "too-large", size: 64, digest: null });
	});

	it.each([
		["archiveSize", only({ archiveSize: 16 })],
		["fileCount", only({ fileCount: 1 })],
	])("rejects with a limit error when %s is exceeded", async (_, limits) => {
		const extraction = extractArchive(
			zip({ "plugin/a.php": strToU8("<?php\n"), "plugin/b.php": strToU8("<?php\n") }),
			"zip",
			limits,
		);
		await expect(extraction).rejects.toBeInstanceOf(AppError);
		await expect(extraction).rejects.toMatchObject({ code: "limit" });
	});
});
