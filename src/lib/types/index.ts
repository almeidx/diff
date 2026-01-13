export type PackageType = 'npm' | 'wp';

export interface PackageInfo {
	type: PackageType;
	name: string;
	versions: string[];
}

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

export type DiffStatus = 'added' | 'deleted' | 'modified';

export interface WordChange {
	type: 'equal' | 'insert' | 'delete';
	text: string;
}

export interface DiffLine {
	type: 'context' | 'add' | 'delete';
	oldNumber: number | null;
	newNumber: number | null;
	content: string;
	wordDiff?: WordChange[];
}

export interface DiffHunk {
	oldStart: number;
	oldCount: number;
	newStart: number;
	newCount: number;
	lines: DiffLine[];
}

export interface DiffFile {
	path: string;
	status: DiffStatus;
	isBinary: boolean;
	isMinified: boolean;
	hunks: DiffHunk[];
	oldContent?: string;
	newContent?: string;
}

export interface DiffStats {
	files: number;
	insertions: number;
	deletions: number;
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
	type: 'invalid_version';
	availableVersions: string[];
	message: string;
}

export interface PackageError {
	type: 'package_not_found';
	message: string;
}

export type DiffError = VersionError | PackageError | { type: 'fetch_error'; message: string };
