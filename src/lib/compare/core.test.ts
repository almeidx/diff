import { afterEach, describe, expect, it, vi } from "vitest";

import type { FileTree } from "#lib/types/index.js";
import type { LoadDiffPageOptions } from "#lib/diff/load-diff-page.js";
import { compare, fileContents, getFileContentsPair } from "./core.js";
import * as loadDiffPage from "#lib/diff/load-diff-page.js";

function tree(entries: Array<{ path: string; content: string; isBinary?: boolean }>): FileTree {
	return {
		files: new Map(
			entries.map((entry) => [
				entry.path,
				{
					path: entry.path,
					content: entry.content,
					isBinary: entry.isBinary ?? false,
					isMinified: false,
					size: entry.content.length,
				},
			]),
		),
	};
}

describe("getFileContentsPair", () => {
	it("returns both contents when the path exists in both trees", () => {
		const oldTree = tree([{ path: "a.js", content: "old" }]);
		const newTree = tree([{ path: "a.js", content: "new" }]);

		expect(getFileContentsPair(oldTree, newTree, "a.js")).toEqual({
			oldContents: "old",
			newContents: "new",
		});
	});

	it("returns empty string on the missing side", () => {
		const oldTree = tree([{ path: "a.js", content: "old" }]);
		const newTree = tree([{ path: "b.js", content: "new" }]);

		expect(getFileContentsPair(oldTree, newTree, "a.js")).toEqual({
			oldContents: "old",
			newContents: "",
		});
	});

	it("returns null when the path is missing from both trees", () => {
		const oldTree = tree([{ path: "a.js", content: "old" }]);
		const newTree = tree([{ path: "b.js", content: "new" }]);

		expect(getFileContentsPair(oldTree, newTree, "c.js")).toBeNull();
		expect(getFileContentsPair(null, null, "a.js")).toBeNull();
	});

	it("returns null when either side is binary", () => {
		const oldTree = tree([{ path: "logo.png", content: "old", isBinary: true }]);
		const newTree = tree([{ path: "logo.png", content: "new" }]);

		expect(getFileContentsPair(oldTree, newTree, "logo.png")).toBeNull();
	});
});

describe("compare tree retention", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("retains both trees after a successful compare and replaces them on the next one", async () => {
		const fakeResult = {
			diff: { files: [], stats: { files: 0, insertions: 0, deletions: 0 } },
			versions: [],
		};
		const loadDiffPageDataSpy = vi
			.spyOn(loadDiffPage, "loadDiffPageData")
			.mockReturnValue(Promise.resolve(fakeResult as never));

		// The spy intercepts loadDiffPageData, so the trees are fed via the captured onTrees callback.
		let onTrees: (fromTree: FileTree, toTree: FileTree) => void = () => {};
		const firstFrom = tree([{ path: "a.js", content: "first-old" }]);
		const firstTo = tree([{ path: "a.js", content: "first-new" }]);
		const secondFrom = tree([{ path: "b.js", content: "second-old" }]);
		const secondTo = tree([{ path: "b.js", content: "second-new" }]);

		const runCompare = async () => {
			await compare("npm", "pkg", "1.0.0", "2.0.0");
			const options = loadDiffPageDataSpy.mock.calls.at(-1)![0] as LoadDiffPageOptions;
			onTrees = options.onTrees!;
		};

		await runCompare();
		onTrees(firstFrom, firstTo);
		expect(await fileContents("a.js")).toEqual({ oldContents: "first-old", newContents: "first-new" });

		await runCompare();
		onTrees(secondFrom, secondTo);
		expect(await fileContents("a.js")).toBeNull();
		expect(await fileContents("b.js")).toEqual({ oldContents: "second-old", newContents: "second-new" });
	});
});
