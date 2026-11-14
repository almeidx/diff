import type { ErrorPayload } from "#lib/errors.js";
import type { PackageInfo, PackageSuggestion } from "#lib/registries/types.js";
import type { ChangedFile, DiffItem } from "./diff.js";

export interface CompareRequest {
	registry: string;
	name: string;
	from: string;
	to: string;
	/** The user explicitly opted out of the archive limits. */
	unlimited: boolean;
}

/**
 * Emitted in order: `metadata`, interleaved `download` progress for both
 * sides, one `files` with every change in tree order, then `diffs` batches
 * in that same order.
 */
export type CompareEvent =
	| { type: "metadata" }
	| { type: "download"; side: "from" | "to"; loaded: number; total: number | null; done: boolean }
	| { type: "files"; files: ChangedFile[] }
	| { type: "diffs"; items: DiffItem[]; completed: number; total: number };

export interface RequestResults {
	search: PackageSuggestion[];
	package: PackageInfo;
	compare: null;
}

export type WorkerCall =
	| { type: "search"; registry: string; query: string }
	| { type: "package"; registry: string; name: string }
	| { type: "compare"; request: CompareRequest };

export type WorkerRequest = (WorkerCall & { id: number }) | { id: number; type: "cancel" };

export type WorkerResponse =
	| { id: number; type: "result"; value: RequestResults[WorkerCall["type"]] }
	| { id: number; type: "event"; event: CompareEvent }
	| { id: number; type: "error"; error: ErrorPayload };
