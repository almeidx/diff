import type {
	ComparePayload,
	FileContentsPayload,
	VersionsPayload,
	WorkerRequest,
	WorkerResponse,
} from "./protocol.js";
import type { CompareProgress } from "#lib/types/index.js";
import { compare, fileContents, versions } from "./core.js";
import { getErrorMessage } from "#lib/errors.js";

export async function handleRequest(
	request: WorkerRequest,
	emitProgress?: (progress: CompareProgress) => void,
): Promise<WorkerResponse> {
	try {
		let value: VersionsPayload | ComparePayload | FileContentsPayload;
		switch (request.kind) {
			case "versions":
				value = await versions(request.type, request.name);
				break;
			case "compare":
				value = await compare(request.type, request.name, request.fromVersion, request.toVersion, emitProgress);
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

if (typeof self !== "undefined") {
	self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
		const request = event.data;
		const response = await handleRequest(request, (progress) => {
			const message: WorkerResponse = { id: request.id, kind: "progress", progress };
			try {
				self.postMessage(message);
			} catch {
				// Port closed; nothing to recover.
			}
		});
		try {
			self.postMessage(response);
		} catch {
			// Port closed or message failed to serialize; nothing to recover.
		}
	};
}
