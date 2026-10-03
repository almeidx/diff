/// <reference types="@sveltejs/kit" />

declare global {
	namespace Cloudflare {
		interface Env {
			/** Optional binding; rate limiting falls back to in-memory counters when absent. */
			RATE_LIMIT_KV?: KVNamespace;
		}
	}
}

export {};
