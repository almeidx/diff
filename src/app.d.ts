declare module "cloudflare:workers" {
	export const env: Cloudflare.Env;
	export function waitUntil(promise: Promise<unknown>): void;
}

declare namespace Cloudflare {
	interface Env {
		/** Optional binding; rate limiting falls back to in-memory counters when absent. */
		RATE_LIMIT_KV?: KVNamespace;
	}

	interface KVNamespace {
		get(key: string): Promise<string | null>;
		put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
	}
}
