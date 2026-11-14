import { processFile, type FileDiffMetadata } from "@pierre/diffs";
import { createTwoFilesPatch } from "diff";
import type { ArchiveEntry, ArchiveFiles } from "#lib/archive/extract.js";

/** jsdiff is O(N·D); past this budget a file is shown as a whole-file replacement. */
const DIFF_TIMEOUT_MS = 2_000;
const MISSING_FILE = "/dev/null";
const MINIFIED_PATTERNS = [
	/\.min\.(js|css)$/,
	/\.bundle\.js$/,
	/-min\.js$/,
	/\.prod\.js$/,
	/\.(js|mjs|cjs|ts|mts|cts|css)\.map$/,
];
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export type FileStatus = "added" | "deleted" | "modified";

export interface ChangedFile {
	path: string;
	status: FileStatus;
	/** Only `text` files carry line diffs; the others are listed with their sizes. */
	kind: ArchiveEntry["kind"];
	/** Generated code whose diff is rarely readable; shown collapsed. */
	minified: boolean;
	oldSize: number | null;
	newSize: number | null;
}

export interface DiffItem {
	change: ChangedFile;
	fileDiff: FileDiffMetadata;
	additions: number;
	deletions: number;
	/** The line diff timed out and was replaced by a whole-file rewrite. */
	approximate: boolean;
}

/**
 * Tree order: directories before files at every level, then natural name
 * order. The file tree is fed presorted paths, so it and the diff list match.
 */
export function comparePaths(a: string, b: string): number {
	const left = a.split("/");
	const right = b.split("/");
	for (let i = 0; i < Math.min(left.length, right.length); i++) {
		if (left[i] === right[i]) continue;
		const leftIsDir = i < left.length - 1;
		if (leftIsDir !== i < right.length - 1) return leftIsDir ? -1 : 1;
		return collator.compare(left[i], right[i]) || (left[i] < right[i] ? -1 : 1);
	}
	return left.length - right.length;
}

function isUnchanged(before: ArchiveEntry, after: ArchiveEntry): boolean {
	if (before.kind === "text" || after.kind === "text") {
		return before.kind === "text" && after.kind === "text" && before.content === after.content;
	}
	// Zip entries skipped without decompression have no digest; size is all there is.
	return (
		before.size === after.size && (before.digest === null || after.digest === null || before.digest === after.digest)
	);
}

/** Bundles without a telltale name are long text whose lines average hundreds of characters. */
function isMinified(path: string, entry: ArchiveEntry | undefined): boolean {
	const fileName = path.slice(path.lastIndexOf("/") + 1);
	if (MINIFIED_PATTERNS.some((pattern) => pattern.test(fileName))) return true;
	if (entry?.kind !== "text" || entry.content.length < 2_000) return false;
	let lines = 1;
	for (let i = entry.content.indexOf("\n"); i !== -1; i = entry.content.indexOf("\n", i + 1)) lines++;
	return entry.content.length / lines > 250;
}

export function listChanges(before: ArchiveFiles, after: ArchiveFiles): ChangedFile[] {
	const changes: ChangedFile[] = [];
	for (const path of new Set([...before.keys(), ...after.keys()])) {
		const old = before.get(path);
		const next = after.get(path);
		if (old && next && isUnchanged(old, next)) continue;

		const kinds = [old?.kind, next?.kind];
		changes.push({
			path,
			status: !old ? "added" : !next ? "deleted" : "modified",
			kind: kinds.includes("binary") ? "binary" : kinds.includes("too-large") ? "too-large" : "text",
			minified: isMinified(path, old) || isMinified(path, next),
			oldSize: old?.size ?? null,
			newSize: next?.size ?? null,
		});
	}
	return changes.sort((a, b) => comparePaths(a.path, b.path));
}

function replacementPatch(path: string, oldText: string, newText: string): string {
	const out = [`--- ${path}`, `+++ ${path}`];
	const sides = [
		{ prefix: "-", lines: oldText ? oldText.replace(/\n$/, "").split("\n") : [], eol: oldText.endsWith("\n") },
		{ prefix: "+", lines: newText ? newText.replace(/\n$/, "").split("\n") : [], eol: newText.endsWith("\n") },
	];
	const [old, next] = sides;
	out.push(`@@ -${old.lines.length ? 1 : 0},${old.lines.length} +${next.lines.length ? 1 : 0},${next.lines.length} @@`);
	for (const side of sides) {
		for (const line of side.lines) out.push(side.prefix + line);
		if (side.lines.length > 0 && !side.eol) out.push("\\ No newline at end of file");
	}
	return `${out.join("\n")}\n`;
}

export function diffFile(
	change: ChangedFile,
	old: ArchiveEntry | undefined,
	next: ArchiveEntry | undefined,
	cacheKey: string,
): DiffItem {
	const type = change.status === "added" ? "new" : change.status === "deleted" ? "deleted" : "change";

	if (change.kind !== "text") {
		return {
			change,
			approximate: false,
			additions: 0,
			deletions: 0,
			fileDiff: {
				name: change.path,
				type,
				hunks: [],
				splitLineCount: 0,
				unifiedLineCount: 0,
				isPartial: false,
				deletionLines: [],
				additionLines: [],
				deletionCharacterCount: 0,
				additionCharacterCount: 0,
				cacheKey,
			},
		};
	}

	const oldFile = { name: old ? change.path : MISSING_FILE, contents: old?.kind === "text" ? old.content : "" };
	const newFile = { name: next ? change.path : MISSING_FILE, contents: next?.kind === "text" ? next.content : "" };
	const exact = createTwoFilesPatch(
		oldFile.name,
		newFile.name,
		oldFile.contents,
		newFile.contents,
		undefined,
		undefined,
		{
			timeout: DIFF_TIMEOUT_MS,
		},
	);
	const patch = exact ?? replacementPatch(change.path, oldFile.contents, newFile.contents);
	const fileDiff = processFile(patch, { oldFile, newFile, cacheKey, throwOnError: true });
	if (!fileDiff) throw new Error(`Could not diff ${change.path}`);

	fileDiff.name = change.path;
	fileDiff.prevName = undefined;
	fileDiff.type = type;

	let additions = 0;
	let deletions = 0;
	for (const hunk of fileDiff.hunks) {
		additions += hunk.additionLines;
		deletions += hunk.deletionLines;
	}
	return { change, fileDiff, additions, deletions, approximate: exact === undefined };
}
