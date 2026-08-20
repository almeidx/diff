import { structuredPatch } from "diff";
import type {
	DiffResult,
	DiffFile,
	DiffStats,
	DiffStatus,
	FileEntry,
	FileTree,
	PackageType,
} from "$lib/types/index.js";

const CONTEXT_LINES = 3;

export function computeDiff(
	oldTree: FileTree,
	newTree: FileTree,
	packageType: PackageType,
	packageName: string,
	fromVersion: string,
	toVersion: string,
): DiffResult {
	const files: DiffFile[] = [];
	const stats: DiffStats = { files: 0, insertions: 0, deletions: 0 };

	const allPaths = new Set([...oldTree.files.keys(), ...newTree.files.keys()]);

	for (const path of Array.from(allPaths).sort()) {
		const diffFile = createDiffFile(path, oldTree.files.get(path), newTree.files.get(path));
		if (!diffFile) continue;

		files.push(diffFile);
		stats.files++;
		stats.insertions += diffFile.additions;
		stats.deletions += diffFile.deletions;
	}

	return { packageType, packageName, fromVersion, toVersion, files, stats };
}

function createDiffFile(path: string, oldFile?: FileEntry, newFile?: FileEntry): DiffFile | null {
	if (!oldFile && !newFile) return null;

	const status: DiffStatus = !oldFile ? "added" : !newFile ? "deleted" : "modified";
	const isMinified = Boolean(oldFile?.isMinified || newFile?.isMinified);

	if (status === "modified") {
		if (oldFile!.isBinary || newFile!.isBinary) {
			if (oldFile!.size === newFile!.size) return null;
			return unrenderable(path, status, true, isMinified);
		}
		if (oldFile!.content === newFile!.content) return null;
	} else {
		const file = (oldFile ?? newFile)!;
		if (file.isBinary || file.content === null) {
			return unrenderable(path, status, file.isBinary, isMinified);
		}
	}

	const { hunks } = structuredPatch(path, path, oldFile?.content ?? "", newFile?.content ?? "", undefined, undefined, {
		context: CONTEXT_LINES,
	});
	if (hunks.length === 0) return null;

	let additions = 0;
	let deletions = 0;
	const body: string[] = [];

	for (const hunk of hunks) {
		body.push(formatHunkHeader(hunk));
		for (const line of hunk.lines) {
			if (line.startsWith("+")) additions++;
			else if (line.startsWith("-")) deletions++;
			body.push(line);
		}
	}

	return {
		path,
		status,
		isBinary: false,
		isMinified,
		patch: formatPatch(path, status, body),
		additions,
		deletions,
	};
}

function unrenderable(path: string, status: DiffStatus, isBinary: boolean, isMinified: boolean): DiffFile {
	return { path, status, isBinary, isMinified, patch: "", additions: 0, deletions: 0 };
}

function formatHunkHeader(hunk: { oldStart: number; oldLines: number; newStart: number; newLines: number }): string {
	const oldStart = hunk.oldLines === 0 ? 0 : hunk.oldStart;
	const newStart = hunk.newLines === 0 ? 0 : hunk.newStart;
	return `@@ -${oldStart},${hunk.oldLines} +${newStart},${hunk.newLines} @@`;
}

function formatPatch(path: string, status: DiffStatus, body: string[]): string {
	const safePath = path.replace(/\n/g, "");
	const lines = [`diff --git a/${safePath} b/${safePath}`];

	if (status === "added") {
		lines.push("new file mode 100644");
	} else if (status === "deleted") {
		lines.push("deleted file mode 100644");
	}

	lines.push(`--- ${status === "added" ? "/dev/null" : `a/${safePath}`}`);
	lines.push(`+++ ${status === "deleted" ? "/dev/null" : `b/${safePath}`}`);
	lines.push(...body);

	return `${lines.join("\n")}\n`;
}
