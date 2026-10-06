import type { ComparePayload, FileContentsPayload, VersionsPayload, WorkerRequest, WorkerResponse } from "./protocol.js";
import { compare, fileContents, versions } from "./core.js";
import { getErrorMessage } from "#lib/errors.js";

export async function handleRequest(request: WorkerRequest): Promise<WorkerResponse> {
	try {
		let value: VersionsPayload | ComparePayload | FileContentsPayload;
		switch (request.kind) {
			case "versions":
				value = await versions(request.type, request.name);
				break;
			case "compare":
				value = await compare(request.type, request.name, request.fromVersion, request.toVersion);
				break;
			case "fileContents":
				value = await fileContents(request.path);
				break;
		}
		return { id: request.id, kind: "result", value };
	} catch (error) {
		return { id: request.id, kind: "error", message: getErrorMessage(error, "Failed to run comparison") };
	}
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const request = event.data;
	const response = await handleRequest(request);
	try {
		self.postMessage(response);
	} catch {
		// Port closed or message failed to serialize; nothing to recover.
	}
};