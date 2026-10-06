import type {
	ComparePayload,
	FileContentsPayload,
	VersionsPayload,
	WorkerRequest,
	WorkerResponse,
} from "./protocol.js";
import type { FileContentsPair, PackageType } from "#lib/types/index.js";
import type { LoadDiffPageResult } from "#lib/diff/load-diff-page.js";

type Pending = { resolve: (value: VersionsPayload | ComparePayload | FileContentsPayload) => void; reject: (error: Error) => void };

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
		pending.delete(response.id);
		if (response.kind === "error") {
			entry.reject(new Error(response.message));
		} else {
			entry.resolve(response.value);
		}
	};
	w.onerror = () => failAll("Compare worker crashed");
	w.onmessageerror = () => failAll("Compare worker returned an unserializable message");

	worker = w;
	return w;
}

function call(request: Omit<WorkerRequest, "id">): Promise<VersionsPayload | ComparePayload | FileContentsPayload> {
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
): Promise<LoadDiffPageResult> {
	return call({ kind: "compare", type, name, fromVersion, toVersion }) as Promise<LoadDiffPageResult>;
}

export function fileContents(path: string): Promise<FileContentsPair | null> {
	return call({ kind: "fileContents", path }) as Promise<FileContentsPair | null>;
}