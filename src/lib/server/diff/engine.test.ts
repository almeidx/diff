import { describe, expect, it } from "vitest";
import { computeDiff } from "./engine";
import type { FileTree } from "$lib/types/index.js";

function createTextTree(path: string, content: string): FileTree {
	return {
		files: new Map([
			[
				path,
				{
					path,
					content,
					isBinary: false,
					isMinified: false,
					size: content.length,
				},
			],
		]),
	};
}

describe("computeDiff", () => {
	it("handles files with more than 65k unique lines without token collisions", () => {
		const lineCount = 66050;
		const oldLines = Array.from({ length: lineCount }, (_, i) => `line-${i}`);
		const newLines = [...oldLines];
		newLines[lineCount - 1] = `line-${lineCount - 1}-updated`;

		const oldTree = createTextTree("huge.txt", oldLines.join("\n"));
		const newTree = createTextTree("huge.txt", newLines.join("\n"));

		const result = computeDiff(oldTree, newTree, "npm", "fixture", "1.0.0", "1.0.1");

		expect(result.stats.files).toBe(1);
		expect(result.stats.insertions).toBe(1);
		expect(result.stats.deletions).toBe(1);
		expect(result.files[0]?.path).toBe("huge.txt");
	});
});
