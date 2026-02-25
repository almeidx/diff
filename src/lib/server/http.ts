interface UrlValidationOptions {
	allowedHosts?: string[];
}

interface AbortSetup {
	signal: AbortSignal;
	cleanup: () => void;
}

export interface FetchWithTimeoutOptions extends RequestInit, UrlValidationOptions {
	timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function isHostAllowed(hostname: string, allowedHosts: string[]): boolean {
	return allowedHosts.some((allowedHost) => {
		const normalizedAllowedHost = allowedHost.toLowerCase();
		const normalizedHost = hostname.toLowerCase();
		return normalizedHost === normalizedAllowedHost || normalizedHost.endsWith(`.${normalizedAllowedHost}`);
	});
}

export function assertSafeUpstreamUrl(input: string | URL, options: UrlValidationOptions = {}): URL {
	let url: URL;
	try {
		url = input instanceof URL ? new URL(input.toString()) : new URL(input);
	} catch {
		throw new Error("Invalid upstream URL");
	}

	if (url.protocol !== "https:") {
		throw new Error("Only HTTPS upstream URLs are allowed");
	}

	const { allowedHosts } = options;
	if (allowedHosts && allowedHosts.length > 0 && !isHostAllowed(url.hostname, allowedHosts)) {
		throw new Error(`Upstream host "${url.hostname}" is not allowed`);
	}

	return url;
}

function createAbortSignal(signal: AbortSignal | null, timeoutMs: number): AbortSetup {
	const timeoutController = new AbortController();
	let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
		timeoutController.abort(new Error(`Upstream request timed out after ${timeoutMs}ms`));
	}, timeoutMs);

	const controller = new AbortController();

	function abortFromTimeout(): void {
		controller.abort(timeoutController.signal.reason);
	}

	function abortFromSignal(): void {
		controller.abort(signal?.reason);
	}

	timeoutController.signal.addEventListener("abort", abortFromTimeout, { once: true });

	if (signal) {
		if (signal.aborted) {
			abortFromSignal();
		} else {
			signal.addEventListener("abort", abortFromSignal, { once: true });
		}
	}

	return {
		signal: controller.signal,
		cleanup: () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			timeoutController.signal.removeEventListener("abort", abortFromTimeout);
			if (signal) {
				signal.removeEventListener("abort", abortFromSignal);
			}
		},
	};
}

export async function fetchWithTimeout(
	input: string | URL,
	options: FetchWithTimeoutOptions = {},
): Promise<Response> {
	const { timeoutMs = DEFAULT_TIMEOUT_MS, allowedHosts, signal, ...requestInit } = options;
	const url = assertSafeUpstreamUrl(input, { allowedHosts });
	const abort = createAbortSignal(signal ?? null, timeoutMs);

	try {
		return await fetch(url.toString(), {
			...requestInit,
			signal: abort.signal,
		});
	} finally {
		abort.cleanup();
	}
}
