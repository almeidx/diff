import type { CompareProgress, FileContentsPair, PackageType } from "#lib/types/index.js";
import type { LoadDiffPageResult } from "#lib/diff/load-diff-page.js";
import type { ArchiveLimits } from "#lib/archive/limits.js";

export type VersionsPayload = string[];
export type ComparePayload = LoadDiffPageResult;
export type FileContentsPayload = FileContentsPair | null;

export type WorkerRequest =
	| { id: number; kind: "versions"; type: PackageType; name: string }
	| {
			id: number;
			kind: "compare";
			type: PackageType;
			name: string;
			fromVersion: string;
			toVersion: string;
			limits?: ArchiveLimits;
	  }
	| { id: number; kind: "fileContents"; path: string };

export type WorkerResponse =
	| { id: number; kind: "progress"; progress: CompareProgress }
	| { id: number; kind: "result"; value: VersionsPayload | ComparePayload | FileContentsPayload }
	| { id: number; kind: "error"; message: string };
