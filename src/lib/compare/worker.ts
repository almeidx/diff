/// <reference lib="webworker" />
import { AppError, toErrorPayload } from "#lib/errors.js";
import { getPackage, getRegistry } from "#lib/registries/index.js";
import { runCompare } from "./pipeline.js";
import type { CompareEvent, RequestResults, WorkerCall, WorkerRequest, WorkerResponse } from "./protocol.js";

declare const self: DedicatedWorkerGlobalScope;

const controllers = new Map<number, AbortController>();

async function handle(
	call: WorkerCall,
	signal: AbortSignal,
	emit: (event: CompareEvent) => void,
): Promise<RequestResults[WorkerCall["type"]]> {
	const registry = getRegistry(call.registry);
	if (!registry) throw new AppError(`Unknown registry "${call.registry}".`, "not-found");

	switch (call.type) {
		case "search":
			return registry.search(call.query, signal);
		case "package":
			return getPackage(registry, call.name);
		case "compare":
			await runCompare(registry, call, emit, signal);
			return null;
	}
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
	const { id } = data;
	if (data.type === "cancel") {
		controllers.get(id)?.abort();
		return;
	}

	const controller = new AbortController();
	controllers.set(id, controller);
	const post = (response: WorkerResponse) => {
		if (!controller.signal.aborted) self.postMessage(response);
	};

	try {
		const value = await handle(data, controller.signal, (event) => post({ id, type: "event", event }));
		post({ id, type: "result", value });
	} catch (error) {
		post({ id, type: "error", error: toErrorPayload(error) });
	} finally {
		controllers.delete(id);
	}
};
