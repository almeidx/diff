import type { FileContentsPair, FileTree, PackageType } from "#lib/types/index.js";
import type { LoadDiffPageResult } from "#lib/diff/load-diff-page.js";
import { loadDiffPageData } from "#lib/diff/load-diff-page.js";
import { npmRegistry, wordpressRegistry } from "#lib/registries/index.js";

/** Trees retained from the last successful compare(), so fileContents() never re-downloads archives. */
let lastFromTree: FileTree | null = null;
let lastToTree: FileTree | null = null;
let compareSeq = 0;

export function versions(type: PackageType, name: string): Promise<string[]> {
	return (type === "npm" ? npmRegistry : wordpressRegistry).getVersions(name);
}

export function compare(
	type: PackageType,
	name: string,
	fromVersion: string,
	toVersion: string,
): Promise<LoadDiffPageResult> {
	// Worker message handlers run concurrently: an older comparison can finish
	// after a newer one started. Only the newest compare may update the trees.
	const seq = ++compareSeq;
	return loadDiffPageData({
		registry: type === "npm" ? npmRegistry : wordpressRegistry,
		packageType: type,
		packageName: name,
		fromVersion,
		toVersion,
		archiveFormat: type === "npm" ? "tgz" : "zip",
		onTrees: (fromTree, toTree) => {
			if (seq !== compareSeq) return;
			lastFromTree = fromTree;
			lastToTree = toTree;
		},
	});
}

/**
 * Full contents of one file on both sides of the last successful comparison.
 * Returns null when the file is missing from both versions or is not text.
 */
export function fileContents(path: string): Promise<FileContentsPair | null> {
	return Promise.resolve(getFileContentsPair(lastFromTree, lastToTree, path));
}

export function getFileContentsPair(
	oldTree: FileTree | null,
	newTree: FileTree | null,
	path: string,
): FileContentsPair | null {
	const oldFile = oldTree?.files.get(path);
	const newFile = newTree?.files.get(path);

	if (!oldFile && !newFile) return null;
	if (oldFile?.isBinary || newFile?.isBinary) return null;

	return {
		oldContents: oldFile?.content ?? "",
		newContents: newFile?.content ?? "",
	};
}
