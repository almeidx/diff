import type {
	ComparePayload,
	FileContentsPayload,
	VersionsPayload,
	WorkerRequest,
	WorkerResponse,
} from "./protocol.js";
import type { CompareProgress, FileContentsPair, PackageType } from "#lib/types/index.js";
import type { LoadDiffPageResult } from "#lib/diff/load-diff-page.js";
import type { ArchiveLimits } from "#lib/archive/limits.js";

/** Message used to reject every pending call after the worker died; route loaders match on it. */
export const WORKER_CRASH_MESSAGE = "Compare worker crashed";

type Pending = {
	resolve: (value: VersionsPayload | ComparePayload | FileContentsPayload) => void;
	reject: (error: Error) => void;
	onProgress?: (progress: CompareProgress) => void;
};

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function failAll(message: string) {
	const error = new Error(message);
	for (const entry of pending.values()) entry.reject(error);
	pending.clear();
	worker = null;
}

function getWorker(): Worker {
	if (worker) return worker;

	const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
	w.onmessage = (event: MessageEvent<WorkerResponse>) => {
		const response = event.data;
		const entry = pending.get(response.id);
		if (!entry) return;
		if (response.kind === "progress") {
			entry.onProgress?.(response.progress);
			return;
		}
		pending.delete(response.id);
		if (response.kind === "error") {
			entry.reject(new Error(response.message));
		} else {
			entry.resolve(response.value);
		}
	};
	w.onerror = () => failAll(WORKER_CRASH_MESSAGE);
	w.onmessageerror = () => failAll("Compare worker returned an unserializable message");

	worker = w;
	return w;
}

/** Distributive so each request variant keeps its own fields (plain Omit would collapse the union). */
type WithoutId<T> = T extends { id: number } ? Omit<T, "id"> : never;

function call(request: WithoutId<WorkerRequest>): Promise<VersionsPayload | ComparePayload | FileContentsPayload> {
	const id = nextId++;
	const { promise, resolve, reject } = Promise.withResolvers<VersionsPayload | ComparePayload | FileContentsPayload>();
	pending.set(id, { resolve, reject });
	try {
		getWorker().postMessage({ ...request, id } satisfies WorkerRequest);
	} catch (error) {
		pending.delete(id);
		reject(error instanceof Error ? error : new Error(String(error)));
	}
	return promise;
}

export function versions(type: PackageType, name: string): Promise<string[]> {
	return call({ kind: "versions", type, name }) as Promise<string[]>;
}

export function compare(
	type: PackageType,
	name: string,
	fromVersion: string,
	toVersion: string,
	onProgress?: (progress: CompareProgress) => void,
	limits?: ArchiveLimits,
): Promise<LoadDiffPageResult> {
	const id = nextId++;
	const { promise, resolve, reject } = Promise.withResolvers<VersionsPayload | ComparePayload | FileContentsPayload>();
	pending.set(id, { resolve, reject, onProgress });
	try {
		getWorker().postMessage({
			kind: "compare",
			type,
			name,
			fromVersion,
			toVersion,
			limits,
			id,
		} satisfies WorkerRequest);
	} catch (error) {
		pending.delete(id);
		reject(error instanceof Error ? error : new Error(String(error)));
	}
	return promise as Promise<LoadDiffPageResult>;
}

export function fileContents(path: string): Promise<FileContentsPair | null> {
	return call({ kind: "fileContents", path }) as Promise<FileContentsPair | null>;
}
