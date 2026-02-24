declare global {
	namespace App {
		interface Platform {
			env: {
				RATE_LIMIT_KV?: {
					get(key: string): Promise<string | null>;
					put(
						key: string,
						value: string,
						options?: { expirationTtl?: number }
					): Promise<void>;
				};
			};
			context: ExecutionContext;
			caches: CacheStorage;
		}
	}
}

export {};
