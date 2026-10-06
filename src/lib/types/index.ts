export type PackageType = "npm" | "wp";

export interface FileEntry {
	path: string;
	content: string | null;
	isBinary: boolean;
	isMinified: boolean;
	size: number;
}

export interface FileTree {
	files: Map<string, FileEntry>;
}

export type DiffStatus = "added" | "deleted" | "modified";

export interface DiffFile {
	path: string;
	status: DiffStatus;
	isBinary: boolean;
	isMinified: boolean;
	/** Git-format patch for this file. Empty when there is nothing renderable. */
	patch: string;
	additions: number;
	deletions: number;
}

export interface DiffStats {
	files: number;
	insertions: number;
	deletions: number;
}

/** Stage of a running comparison, emitted as progress by the worker pipeline. */
export type CompareStage = "metadata" | "download" | "diff";

export interface CompareProgress {
	stage: CompareStage;
	/** Which archive a download event refers to. */
	side?: "from" | "to";
	bytes?: number;
	totalBytes?: number | null;
	done?: boolean;
}

/** Identifies the comparison a diff came from, so the client can fetch more of it. */
export interface DiffSource {
	packageType: PackageType;
	packageName: string;
	fromVersion: string;
	toVersion: string;
}

/** Full contents of one file on both sides of a comparison. */
export interface FileContentsPair {
	oldContents: string;
	newContents: string;
}

export interface DiffResult {
	packageType: PackageType;
	packageName: string;
	fromVersion: string;
	toVersion: string;
	files: DiffFile[];
	stats: DiffStats;
}

export interface TreeNode {
	name: string;
	path: string;
	isDirectory: boolean;
	status?: DiffStatus;
	children?: TreeNode[];
	file?: DiffFile;
}

export interface VersionError {
	type: "invalid_version";
	availableVersions: string[];
	message: string;
}

export interface PackageError {
	type: "package_not_found";
	message: string;
}

export type DiffError =
	| VersionError
	| PackageError
	| { type: "fetch_error"; message: string }
	| { type: "limit_exceeded"; message: string };
