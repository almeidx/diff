declare global {
	namespace App {
		interface Platform {
			env: {};
			context: ExecutionContext;
			caches: CacheStorage;
		}
	}
}

export {};
