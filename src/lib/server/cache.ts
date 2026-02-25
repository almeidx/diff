import { logDebug, logWarn } from "$lib/server/log.js";

const CACHE_NAME = "diff-cache-v1";

interface CacheOptions {
	ttlSeconds: number;
}

const DEFAULT_TTL = 300; // 5 minutes

function isCacheAvailable(): boolean {
	return typeof caches !== "undefined";
}

export async function getCached<T>(
	key: string,
	fetcher: () => Promise<T>,
	options: CacheOptions = { ttlSeconds: DEFAULT_TTL },
): Promise<T> {
	if (!isCacheAvailable()) {
		logDebug("cache_unavailable", { key });
		return fetcher();
	}

	const cache = await caches.open(CACHE_NAME);
	const cacheKey = new Request(`https://cache.internal/${encodeURIComponent(key)}`);

	const cached = await cache.match(cacheKey);
	if (cached) {
		try {
			logDebug("cache_hit", { key });
			return (await cached.json()) as T;
		} catch (e) {
			logWarn("cache_parse_failed", { key, error: e });
		}
	}

	logDebug("cache_miss", { key });
	const data = await fetcher();

	const response = new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": `public, max-age=${options.ttlSeconds}`,
		},
	});

	await cache.put(cacheKey, response);
	logDebug("cache_store", { key, ttlSeconds: options.ttlSeconds });

	return data;
}

export async function invalidateCache(key: string): Promise<void> {
	if (!isCacheAvailable()) {
		return;
	}

	const cache = await caches.open(CACHE_NAME);
	const cacheKey = new Request(`https://cache.internal/${encodeURIComponent(key)}`);
	await cache.delete(cacheKey);
}
