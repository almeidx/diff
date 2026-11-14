import type { ErrorPayload } from "#lib/errors.js";
import type { PackageInfo, PackageSuggestion } from "#lib/registries/types.js";
import type { ChangedFile, DiffItem } from "./diff.js";

export type Side = "from" | "to";

export interface CompareRequest {
	registry: string;
	name: string;
	from: string;
	to: string;
	/** The user explicitly opted out of the archive limits. */
	unlimited: boolean;
}

export interface DownloadProgress {
	loaded: number;
	total: number | null;
	done: boolean;
}

/**
 * Emitted in order: `package`, interleaved `download` progress for both
 * sides, one `files` with every change in tree order, then `diffs` batches
 * in that same order.
 */
export type CompareEvent =
	| { type: "package"; info: PackageInfo }
	| ({ type: "download"; side: Side } & DownloadProgress)
	| { type: "files"; files: ChangedFile[] }
	| { type: "diffs"; items: DiffItem[]; completed: number };

export interface RequestResults {
	search: PackageSuggestion[];
	package: PackageInfo;
	compare: null;
}

export type WorkerCall =
	| { type: "search"; registry: string; query: string }
	| { type: "package"; registry: string; name: string }
	| ({ type: "compare" } & CompareRequest);

export type WorkerRequest = (WorkerCall & { id: number }) | { id: number; type: "cancel" };

export type WorkerResponse =
	| { id: number; type: "result"; value: RequestResults[WorkerCall["type"]] }
	| { id: number; type: "event"; event: CompareEvent }
	| { id: number; type: "error"; error: ErrorPayload };
