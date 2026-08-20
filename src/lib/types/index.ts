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

/** Identifies the comparison a diff came from, so the client can fetch more of it. */
export interface DiffSource {
	packageType: PackageType;
	packageName: string;
	fromVersion: string;
	toVersion: string;
}

/** Cached for 24h; bump DIFF_SCHEMA_VERSION in server/diff/cache-key.ts when this changes shape. */
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

export type DiffError = VersionError | PackageError | { type: "fetch_error"; message: string };
