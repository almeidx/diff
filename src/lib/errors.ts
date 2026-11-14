/**
 * `not-found`: unknown package or version. `limit`: an archive tripped an
 * extraction guardrail, so the UI can offer the explicit "no limits" opt-in.
 */
export type ErrorCode = "not-found" | "limit" | "failed";

export interface ErrorPayload {
	message: string;
	code: ErrorCode;
}

export class AppError extends Error {
	readonly code: ErrorCode;

	constructor(message: string, code: ErrorCode = "failed") {
		super(message);
		this.name = "AppError";
		this.code = code;
	}
}

/** Serializes any thrown value for the worker boundary without leaking raw upstream URLs. */
export function toErrorPayload(error: unknown): ErrorPayload {
	if (error instanceof AppError) return { message: error.message, code: error.code };
	if (error instanceof RangeError) {
		return { message: "Ran out of memory while extracting the package.", code: "limit" };
	}
	if (error instanceof DOMException && error.name === "TimeoutError") {
		return { message: "The registry took too long to respond.", code: "failed" };
	}
	if (error instanceof TypeError) {
		return { message: "Network request failed. Check your connection and try again.", code: "failed" };
	}
	const message = error instanceof Error ? error.message : "";
	if (!message || message.length > 300 || /https?:\/\//i.test(message)) {
		return { message: "Something went wrong while comparing.", code: "failed" };
	}
	return { message, code: "failed" };
}
