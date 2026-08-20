import { describe, expect, it } from "vitest";
import { processFile } from "@pierre/diffs";
import { computeDiff } from "./engine";
import type { FileEntry, FileTree } from "$lib/types/index.js";

function entry(path: string, content: string | null, overrides: Partial<FileEntry> = {}): FileEntry {
	return {
		path,
		content,
		isBinary: false,
		isMinified: false,
		size: content?.length ?? 0,
		...overrides,
	};
}

function tree(...entries: FileEntry[]): FileTree {
	return { files: new Map(entries.map((file) => [file.path, file])) };
}

function diff(oldTree: FileTree, newTree: FileTree) {
	return computeDiff(oldTree, newTree, "npm", "fixture", "1.0.0", "1.0.1");
}

describe("computeDiff", () => {
	it("handles files with more than 65k unique lines without token collisions", () => {
		const lineCount = 66050;
		const oldLines = Array.from({ length: lineCount }, (_, i) => `line-${i}`);
		const newLines = [...oldLines];
		newLines[lineCount - 1] = `line-${lineCount - 1}-updated`;

		const result = diff(tree(entry("huge.txt", oldLines.join("\n"))), tree(entry("huge.txt", newLines.join("\n"))));

		expect(result.stats.files).toBe(1);
		expect(result.stats.insertions).toBe(1);
		expect(result.stats.deletions).toBe(1);
		expect(result.files[0]?.path).toBe("huge.txt");
	});

	it("emits a git patch with context for a modified file", () => {
		const result = diff(tree(entry("a.txt", "a\nb\nc\nd\ne\n")), tree(entry("a.txt", "a\nb\nCHANGED\nd\ne\n")));
		const file = result.files[0];

		expect(file.status).toBe("modified");
		expect(file.additions).toBe(1);
		expect(file.deletions).toBe(1);
		expect(file.patch).toContain("diff --git a/a.txt b/a.txt");
		expect(file.patch).toContain("--- a/a.txt");
		expect(file.patch).toContain("+++ b/a.txt");
		expect(file.patch).toContain("@@ -1,5 +1,5 @@");
		expect(file.patch).toContain("-c");
		expect(file.patch).toContain("+CHANGED");
	});

	it("marks added files against /dev/null", () => {
		const result = diff(tree(), tree(entry("new.txt", "x\ny\n")));
		const file = result.files[0];

		expect(file.status).toBe("added");
		expect(file.patch).toContain("new file mode 100644");
		expect(file.patch).toContain("--- /dev/null");
		expect(file.patch).toContain("@@ -0,0 +1,2 @@");
		expect(file.additions).toBe(2);
		expect(file.deletions).toBe(0);
	});

	it("marks deleted files against /dev/null", () => {
		const result = diff(tree(entry("gone.txt", "x\ny\n")), tree());
		const file = result.files[0];

		expect(file.status).toBe("deleted");
		expect(file.patch).toContain("deleted file mode 100644");
		expect(file.patch).toContain("+++ /dev/null");
		expect(file.patch).toContain("@@ -1,2 +0,0 @@");
		expect(file.deletions).toBe(2);
		expect(file.additions).toBe(0);
	});

	it("excludes files whose contents are unchanged", () => {
		const result = diff(tree(entry("same.txt", "a\nb\n")), tree(entry("same.txt", "a\nb\n")));

		expect(result.files).toHaveLength(0);
		expect(result.stats.files).toBe(0);
	});

	it("reports binary files by size change without a patch", () => {
		const binary = { isBinary: true, size: 10 };
		const unchanged = diff(tree(entry("img.png", null, binary)), tree(entry("img.png", null, binary)));
		expect(unchanged.files).toHaveLength(0);

		const resized = diff(
			tree(entry("img.png", null, binary)),
			tree(entry("img.png", null, { isBinary: true, size: 20 })),
		);
		expect(resized.files).toHaveLength(1);
		expect(resized.files[0].isBinary).toBe(true);
		expect(resized.files[0].patch).toBe("");
	});

	it("produces patches the diff renderer can parse", () => {
		const result = diff(
			tree(entry("src/index.ts", "const a = 1;\nconst b = 2;\nconst c = 3;\n")),
			tree(entry("src/index.ts", "const a = 1;\nconst b = 22;\nconst c = 3;\n")),
		);

		const parsed = processFile(result.files[0].patch, { isGitDiff: true });

		expect(parsed).toBeDefined();
		expect(parsed!.name).toBe("src/index.ts");
		expect(parsed!.type).toBe("change");
		expect(parsed!.hunks).toHaveLength(1);
		expect(parsed!.isPartial).toBe(true);
	});
});
