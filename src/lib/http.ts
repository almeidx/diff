import { AppError } from "./errors.js";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface FetchOptions {
	/** Exact hostnames this request may reach; download URLs come from registry data. */
	hosts: readonly string[];
	signal?: AbortSignal;
	/** `null` disables the timeout: archive downloads report progress instead. */
	timeoutMs?: number | null;
	headers?: HeadersInit;
}

export function upstreamFetch(
	input: string | URL,
	{ hosts, signal, timeoutMs = DEFAULT_TIMEOUT_MS, headers }: FetchOptions,
): Promise<Response> {
	const url = URL.parse(input);
	if (!url) throw new AppError("The registry returned an invalid URL.");
	if (url.protocol !== "https:" || !hosts.includes(url.hostname)) {
		throw new AppError(`Refusing to download from untrusted host "${url.hostname}".`);
	}
	const signals: AbortSignal[] = [];
	if (signal) signals.push(signal);
	if (timeoutMs !== null) signals.push(AbortSignal.timeout(timeoutMs));
	return fetch(url, { headers, signal: signals.length > 0 ? AbortSignal.any(signals) : undefined });
}
