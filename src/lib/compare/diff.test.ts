import { describe, expect, it } from "vitest";
import type { ArchiveEntry, ArchiveFiles } from "#lib/archive/extract.js";
import { comparePaths, diffFile, listChanges } from "./diff";

function files(entries: Record<string, string | ArchiveEntry>): ArchiveFiles {
	return new Map(
		Object.entries(entries).map(([path, entry]) => [
			path,
			typeof entry === "string" ? { kind: "text", size: entry.length, content: entry } : entry,
		]),
	);
}

describe("comparePaths", () => {
	it("orders directories before files, then names naturally", () => {
		const paths = ["b.js", "lib/z.js", "a.js", "lib/sub/x.js", "file10.js", "file2.js"];
		expect(paths.sort(comparePaths)).toEqual(["lib/sub/x.js", "lib/z.js", "a.js", "b.js", "file2.js", "file10.js"]);
	});
});

describe("listChanges", () => {
	it("reports added, deleted and modified files in tree order and skips identical ones", () => {
		const before = files({ "same.js": "1\n", "gone.js": "x\n", "lib/edit.js": "a\n" });
		const after = files({ "same.js": "1\n", "new.js": "y\n", "lib/edit.js": "b\n" });

		expect(listChanges(before, after).map(({ path, status }) => [path, status])).toEqual([
			["lib/edit.js", "modified"],
			["gone.js", "deleted"],
			["new.js", "added"],
		]);
	});

	it("compares opaque files by size and digest, tolerating missing digests", () => {
		const before = files({
			"a.png": { kind: "binary", size: 4, digest: "aa" },
			"b.png": { kind: "binary", size: 4, digest: "aa" },
			"c.png": { kind: "binary", size: 4, digest: null },
		});
		const after = files({
			"a.png": { kind: "binary", size: 4, digest: "aa" },
			"b.png": { kind: "binary", size: 4, digest: "bb" },
			"c.png": { kind: "binary", size: 4, digest: null },
		});

		expect(listChanges(before, after)).toEqual([
			{ path: "b.png", status: "modified", kind: "binary", minified: false, oldSize: 4, newSize: 4 },
		]);
	});
});

describe("diffFile", () => {
	it("produces full-context diffs with line counts", () => {
		const before = files({ "a.js": "one\ntwo\nthree\n" });
		const after = files({ "a.js": "one\n2\nthree\nfour\n" });
		const [change] = listChanges(before, after);

		const item = diffFile(change, before.get("a.js"), after.get("a.js"), "key");

		expect(item).toMatchObject({ additions: 2, deletions: 1, approximate: false });
		expect(item.fileDiff).toMatchObject({ name: "a.js", type: "change", isPartial: false, cacheKey: "key" });
		expect(item.fileDiff.additionLines).toHaveLength(4);
	});

	it("marks added files as new", () => {
		const after = files({ "a.js": "hello\n" });
		const [change] = listChanges(new Map(), after);

		const item = diffFile(change, undefined, after.get("a.js"), "key");

		expect(item.fileDiff).toMatchObject({ name: "a.js", type: "new" });
		expect(item.additions).toBe(1);
	});
});
