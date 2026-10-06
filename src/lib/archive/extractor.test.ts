import { afterEach, describe, expect, it, vi } from "vitest";
import { gzipSync, strToU8, zipSync } from "fflate";
import { fetchAndExtract } from "./extractor";
import { NO_LIMITS, type ArchiveLimits } from "./limits";
import { LimitExceededError } from "#lib/errors.js";

const WP_ZIP_URL = "https://downloads.wordpress.org/plugin/plugin-name.zip";
const NPM_TGZ_URL = "https://registry.npmjs.org/pkg/pkg-1.0.0.tgz";

const encoder = new TextEncoder();

/** Builds a gzipped tar archive with 512-byte headers, padded contents, and a zero-block terminator. */
function tarArchive(entries: Array<{ name: string; content: string }>): Uint8Array<ArrayBuffer> {
	const totalBlocks = entries.reduce((sum, entry) => sum + 1 + Math.ceil(strToU8(entry.content).length / 512), 0) + 2;
	const tar = new Uint8Array(totalBlocks * 512);
	let offset = 0;

	for (const entry of entries) {
		const bytes = strToU8(entry.content);
		const header = tar.subarray(offset, offset + 512);
		header.set(encoder.encode(entry.name), 0);
		header.set(encoder.encode(bytes.length.toString(8).padStart(11, "0") + " "), 124);
		header[156] = 48; // typeflag '0' = regular file
		header.fill(32, 148, 156);
		let checksum = 0;
		for (const byte of header) checksum += byte;
		header.set(encoder.encode(checksum.toString(8).padStart(6, "0") + "\0 "), 148);

		tar.set(bytes, offset + 512);
		offset += (1 + Math.ceil(bytes.length / 512)) * 512;
	}

	// Copy so the buffer is backed by a plain ArrayBuffer, which Response accepts.
	return new Uint8Array(gzipSync(tar));
}

function onlyLimits(overrides: Partial<ArchiveLimits>): ArchiveLimits {
	return { archiveSize: null, decompressedSize: null, fileCount: null, fileSize: null, ...overrides };
}

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

describe("fetchAndExtract limits", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("throws LimitExceededError when the compressed archive exceeds archiveSize", async () => {
		const archive = zipSync({ "plugin-name/plugin.php": strToU8("<?php\n") });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(archive)),
		);

		await expect(fetchAndExtract(WP_ZIP_URL, "zip", undefined, onlyLimits({ archiveSize: 16 }))).rejects.toBeInstanceOf(
			LimitExceededError,
		);
	});

	it("throws LimitExceededError when included text exceeds decompressedSize", async () => {
		const archive = zipSync({ "plugin-name/main.php": [strToU8("<?php\n" + "x".repeat(64)), { level: 0 }] });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(archive)),
		);

		await expect(
			fetchAndExtract(WP_ZIP_URL, "zip", undefined, onlyLimits({ decompressedSize: 16 })),
		).rejects.toBeInstanceOf(LimitExceededError);
	});

	it("throws LimitExceededError when the file count exceeds fileCount", async () => {
		const archive = zipSync({
			"plugin-name/a.php": strToU8("<?php\n"),
			"plugin-name/b.php": strToU8("<?php\n"),
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(archive)),
		);

		await expect(fetchAndExtract(WP_ZIP_URL, "zip", undefined, onlyLimits({ fileCount: 1 }))).rejects.toBeInstanceOf(
			LimitExceededError,
		);
	});

	it("skips files larger than fileSize without failing", async () => {
		const archive = zipSync({ "plugin-name/big.php": [strToU8("x".repeat(64)), { level: 0 }] });
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(archive)),
		);

		const tree = await fetchAndExtract(WP_ZIP_URL, "zip", undefined, onlyLimits({ fileSize: 10 }));

		expect(tree.files.size).toBe(0);
	});

	it("NO_LIMITS bypasses caps that would otherwise reject", async () => {
		const archive = zipSync({
			"plugin-name/a.php": [strToU8("<?php\n" + "x".repeat(64)), { level: 0 }],
			"plugin-name/b.php": strToU8("<?php\n"),
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(archive)),
		);

		const tree = await fetchAndExtract(WP_ZIP_URL, "zip", undefined, NO_LIMITS);

		expect([...tree.files.keys()].sort()).toEqual(["a.php", "b.php"]);
	});

	it("throws LimitExceededError when the tar stream exceeds decompressedSize", async () => {
		const tgz = tarArchive([{ name: "pkg/index.js", content: "export const value = 1;\n" }]);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(tgz)),
		);

		await expect(
			fetchAndExtract(NPM_TGZ_URL, "tgz", undefined, onlyLimits({ decompressedSize: 4 })),
		).rejects.toBeInstanceOf(LimitExceededError);
	});

	it("extracts tar streams with the default limits when nothing is hit", async () => {
		const tgz = tarArchive([{ name: "pkg/index.js", content: "export const value = 1;\n" }]);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(tgz)),
		);

		const tree = await fetchAndExtract(NPM_TGZ_URL, "tgz");

		expect(tree.files.get("index.js")?.content).toBe("export const value = 1;\n");
	});
});
