import { AppError } from "#lib/errors.js";
import type { PackageInfo, PackageSuggestion } from "#lib/registries/types.js";
import type {
	CompareEvent,
	CompareRequest,
	RequestResults,
	WorkerCall,
	WorkerRequest,
	WorkerResponse,
} from "./protocol.js";

interface Pending {
	resolve: (value: never) => void;
	reject: (error: Error) => void;
	onEvent?: (event: CompareEvent) => void;
}

/**
 * One long-lived worker runs every registry request and comparison, so
 * package metadata memoized while picking versions is reused by the compare.
 */
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
	if (worker) return worker;

	worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "compare" });
	worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
		const entry = pending.get(data.id);
		if (!entry) return;
		if (data.type === "event") {
			entry.onEvent?.(data.event);
			return;
		}
		pending.delete(data.id);
		if (data.type === "error") entry.reject(new AppError(data.error.message, data.error.code));
		else entry.resolve(data.value as never);
	};
	worker.onerror = (event) => {
		event.preventDefault();
		worker?.terminate();
		worker = null;
		const error = new AppError("The comparison crashed, most likely because the browser ran out of memory.", "limit");
		for (const entry of pending.values()) entry.reject(error);
		pending.clear();
	};
	return worker;
}

function call<T extends WorkerCall["type"]>(
	message: Extract<WorkerCall, { type: T }>,
	signal?: AbortSignal,
	onEvent?: (event: CompareEvent) => void,
): Promise<RequestResults[T]> {
	const { promise, resolve, reject } = Promise.withResolvers<RequestResults[T]>();
	if (signal?.aborted) {
		reject(signal.reason);
		return promise;
	}

	const id = nextId++;
	pending.set(id, { resolve, reject, onEvent });
	signal?.addEventListener(
		"abort",
		() => {
			if (!pending.delete(id)) return;
			worker?.postMessage({ id, type: "cancel" } satisfies WorkerRequest);
			reject(signal.reason);
		},
		{ once: true },
	);
	getWorker().postMessage({ ...message, id } satisfies WorkerRequest);
	return promise;
}

export function searchPackages(registry: string, query: string, signal?: AbortSignal): Promise<PackageSuggestion[]> {
	return call({ type: "search", registry, query }, signal);
}

export function getPackage(registry: string, name: string, signal?: AbortSignal): Promise<PackageInfo> {
	return call({ type: "package", registry, name }, signal);
}

/** Resolves once every diff has been delivered through `onEvent`. */
export async function compare(
	request: CompareRequest,
	onEvent: (event: CompareEvent) => void,
	signal: AbortSignal,
): Promise<void> {
	await call({ type: "compare", request }, signal, onEvent);
}
