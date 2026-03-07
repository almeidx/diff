import DiffMatchPatch from "diff-match-patch";
import type { DiffResult, DiffFile, DiffHunk, DiffLine, DiffStats, FileTree, PackageType } from "$lib/types/index.js";
import { computeWordDiff } from "./word-diff.js";

const dmp = new DiffMatchPatch();
dmp.Diff_Timeout = 5;
const CONTEXT_LINES = 3;
const MAX_LINE_TOKENS = 0x10ffff;
const MAX_WORD_DIFF_LINE_LENGTH = 10_000;

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
		const oldFile = oldTree.files.get(path);
		const newFile = newTree.files.get(path);

		if (!oldFile && newFile) {
			const diffFile = createAddedFile(newFile.path, newFile);
			files.push(diffFile);
			stats.files++;
			stats.insertions += countLines(newFile.content);
		} else if (oldFile && !newFile) {
			const diffFile = createDeletedFile(oldFile.path, oldFile);
			files.push(diffFile);
			stats.files++;
			stats.deletions += countLines(oldFile.content);
		} else if (oldFile && newFile) {
			if (oldFile.isBinary || newFile.isBinary) {
				if (oldFile.size !== newFile.size) {
					files.push({
						path,
						status: "modified",
						isBinary: true,
						isMinified: oldFile.isMinified || newFile.isMinified,
						hunks: [],
					});
					stats.files++;
				}
			} else if (oldFile.content !== newFile.content) {
				const diffFile = createModifiedFile(path, oldFile, newFile);
				if (diffFile.hunks.length > 0) {
					files.push(diffFile);
					stats.files++;
					for (const hunk of diffFile.hunks) {
						for (const line of hunk.lines) {
							if (line.type === "add") stats.insertions++;
							if (line.type === "delete") stats.deletions++;
						}
					}
				}
			}
		}
	}

	return {
		packageType,
		packageName,
		fromVersion,
		toVersion,
		files,
		stats,
	};
}

function createAddedFile(
	path: string,
	file: { content: string | null; isBinary: boolean; isMinified: boolean },
): DiffFile {
	if (file.isBinary || file.content === null) {
		return {
			path,
			status: "added",
			isBinary: file.isBinary,
			isMinified: file.isMinified,
			hunks: [],
		};
	}

	const lines = file.content.split("\n");
	const diffLines: DiffLine[] = lines.map((content, i) => ({
		type: "add",
		oldNumber: null,
		newNumber: i + 1,
		content,
	}));

	return {
		path,
		status: "added",
		isBinary: false,
		isMinified: file.isMinified,
		hunks: [
			{
				oldStart: 0,
				oldCount: 0,
				newStart: 1,
				newCount: lines.length,
				lines: diffLines,
			},
		],
	};
}

function createDeletedFile(
	path: string,
	file: { content: string | null; isBinary: boolean; isMinified: boolean },
): DiffFile {
	if (file.isBinary || file.content === null) {
		return {
			path,
			status: "deleted",
			isBinary: file.isBinary,
			isMinified: file.isMinified,
			hunks: [],
		};
	}

	const lines = file.content.split("\n");
	const diffLines: DiffLine[] = lines.map((content, i) => ({
		type: "delete",
		oldNumber: i + 1,
		newNumber: null,
		content,
	}));

	return {
		path,
		status: "deleted",
		isBinary: false,
		isMinified: file.isMinified,
		hunks: [
			{
				oldStart: 1,
				oldCount: lines.length,
				newStart: 0,
				newCount: 0,
				lines: diffLines,
			},
		],
	};
}

function createModifiedFile(
	path: string,
	oldFile: { content: string | null; isMinified: boolean },
	newFile: { content: string | null; isMinified: boolean },
): DiffFile {
	const oldContent = oldFile.content || "";
	const newContent = newFile.content || "";

	const oldLines = oldContent.split("\n");
	const newLines = newContent.split("\n");

	const hunks = computeHunks(oldLines, newLines);

	return {
		path,
		status: "modified",
		isBinary: false,
		isMinified: oldFile.isMinified || newFile.isMinified,
		hunks,
	};
}

function computeHunks(oldLines: string[], newLines: string[]): DiffHunk[] {
	const lineDiffs = computeLineDiff(oldLines, newLines);

	const hunks: DiffHunk[] = [];
	let oldLineNum = 1;
	let newLineNum = 1;
	let currentHunk: DiffHunk | null = null;
	let contextBuffer: DiffLine[] = [];

	for (const diff of lineDiffs) {
		if (diff.type === "equal") {
			const diffLine: DiffLine = {
				type: "context",
				oldNumber: oldLineNum++,
				newNumber: newLineNum++,
				content: diff.line,
			};

			if (currentHunk) {
				currentHunk.lines.push(diffLine);
				contextBuffer.push(diffLine);

				if (contextBuffer.length > CONTEXT_LINES) {
					finishHunk(hunks, currentHunk, contextBuffer);
					currentHunk = null;
					contextBuffer = [];
				}
			} else {
				contextBuffer.push(diffLine);
				if (contextBuffer.length > CONTEXT_LINES) {
					contextBuffer.shift();
				}
			}
		} else {
			if (!currentHunk) {
				currentHunk = {
					oldStart: Math.max(1, oldLineNum - contextBuffer.length),
					oldCount: 0,
					newStart: Math.max(1, newLineNum - contextBuffer.length),
					newCount: 0,
					lines: [...contextBuffer],
				};
			}
			contextBuffer = [];

			if (diff.type === "delete") {
				currentHunk.lines.push({
					type: "delete",
					oldNumber: oldLineNum++,
					newNumber: null,
					content: diff.line,
				});
			} else {
				currentHunk.lines.push({
					type: "add",
					oldNumber: null,
					newNumber: newLineNum++,
					content: diff.line,
				});
			}
		}
	}

	if (currentHunk && currentHunk.lines.some((l) => l.type !== "context")) {
		updateHunkCounts(currentHunk);
		hunks.push(currentHunk);
	}

	addWordDiffToHunks(hunks);

	return hunks;
}

interface LineDiff {
	type: "equal" | "add" | "delete";
	line: string;
}

function computeLineDiff(oldLines: string[], newLines: string[]): LineDiff[] {
	const lineArray: string[] = [];
	const lineHash = new Map<string, number>();

	function linesToChars(lines: string[]): string {
		const chars: string[] = [];

		for (const line of lines) {
			let token = lineHash.get(line);
			if (token === undefined) {
				token = lineArray.length;
				if (token > MAX_LINE_TOKENS) {
					throw new Error("File has too many unique lines to diff safely.");
				}
				lineArray.push(line);
				lineHash.set(line, token);
			}
			chars.push(String.fromCodePoint(token));
		}

		return chars.join("");
	}

	const chars1 = linesToChars(oldLines);
	const chars2 = linesToChars(newLines);

	const diffs = dmp.diff_main(chars1, chars2, true);

	const result: LineDiff[] = [];

	for (const [op, chars] of diffs) {
		const type = op === 0 ? "equal" : op === 1 ? "add" : "delete";

		for (const token of chars) {
			const lineIndex = token.codePointAt(0) ?? 0;
			const line = lineArray[lineIndex] ?? "";
			result.push({ type, line });
		}
	}

	return result;
}

function finishHunk(hunks: DiffHunk[], hunk: DiffHunk, contextBuffer: DiffLine[]): void {
	while (hunk.lines.length > 0 && contextBuffer.length > CONTEXT_LINES) {
		const lastLine = hunk.lines[hunk.lines.length - 1];
		if (lastLine.type === "context") {
			hunk.lines.pop();
			contextBuffer.pop();
		} else {
			break;
		}
	}

	updateHunkCounts(hunk);

	if (hunk.lines.some((l) => l.type !== "context")) {
		hunks.push(hunk);
	}
}

function updateHunkCounts(hunk: DiffHunk): void {
	let adds = 0;
	let deletes = 0;
	for (const l of hunk.lines) {
		if (l.type === "add") adds++;
		else if (l.type === "delete") deletes++;
	}
	hunk.oldCount = hunk.lines.length - adds;
	hunk.newCount = hunk.lines.length - deletes;
}

function addWordDiffToHunks(hunks: DiffHunk[]): void {
	for (const hunk of hunks) {
		let i = 0;
		while (i < hunk.lines.length) {
			if (hunk.lines[i].type === "delete") {
				const deleteLines: DiffLine[] = [];
				const addLines: DiffLine[] = [];

				while (i < hunk.lines.length && hunk.lines[i].type === "delete") {
					deleteLines.push(hunk.lines[i]);
					i++;
				}

				while (i < hunk.lines.length && hunk.lines[i].type === "add") {
					addLines.push(hunk.lines[i]);
					i++;
				}

				const pairCount = Math.min(deleteLines.length, addLines.length);
				for (let j = 0; j < pairCount; j++) {
					if (deleteLines[j].content.length + addLines[j].content.length > MAX_WORD_DIFF_LINE_LENGTH) {
						continue;
					}
					const wordDiff = computeWordDiff(deleteLines[j].content, addLines[j].content);
					deleteLines[j].wordDiff = wordDiff.filter((w) => w.type !== "insert");
					addLines[j].wordDiff = wordDiff.filter((w) => w.type !== "delete");
				}
			} else {
				i++;
			}
		}
	}
}

function countLines(content: string | null): number {
	if (!content) return 0;
	let count = 1;
	for (let i = 0; i < content.length; i++) {
		if (content[i] === "\n") count++;
	}
	return count;
}
