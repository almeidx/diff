import type { RequestEvent } from "@sveltejs/kit";
import { getClientIp } from "$lib/server/log.js";

const RATE_LIMIT = 30;
const WINDOW_MS = 60000;
const CLEANUP_INTERVAL_MS = 60000;

const memoryIpCounts = new Map<string, { count: number; resetAt: number }>();
let lastMemoryCleanup = Date.now();

interface RateLimitKvNamespace {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface RateLimitResult {
	allowed: boolean;
	retryAfterSeconds?: number;
}

export async function checkRateLimit(event: RequestEvent): Promise<RateLimitResult> {
	const ip = getClientIp(event.request);
	const now = Date.now();
	const kv = event.platform?.env?.RATE_LIMIT_KV;

	if (kv) {
		return checkKvRateLimit(kv, ip, now);
	}

	return checkMemoryRateLimit(ip, now);
}

async function checkKvRateLimit(kv: RateLimitKvNamespace, ip: string, now: number): Promise<RateLimitResult> {
	const windowId = Math.floor(now / WINDOW_MS);
	const key = `rate:${windowId}:${ip}`;
	const rawCount = await kv.get(key);
	const count = Number.parseInt(rawCount ?? "0", 10) || 0;

	if (count >= RATE_LIMIT) {
		const windowResetAt = (windowId + 1) * WINDOW_MS;
		return {
			allowed: false,
			retryAfterSeconds: Math.max(1, Math.ceil((windowResetAt - now) / 1000)),
		};
	}

	await kv.put(key, String(count + 1), {
		expirationTtl: Math.ceil(WINDOW_MS / 1000) + 10,
	});

	return { allowed: true };
}

function checkMemoryRateLimit(ip: string, now: number): RateLimitResult {
	const record = memoryIpCounts.get(ip);

	if (record && record.resetAt > now) {
		if (record.count >= RATE_LIMIT) {
			return {
				allowed: false,
				retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
			};
		}

		record.count++;
	} else {
		memoryIpCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
	}

	if (now - lastMemoryCleanup > CLEANUP_INTERVAL_MS) {
		lastMemoryCleanup = now;
		for (const [key, value] of memoryIpCounts) {
			if (value.resetAt < now) {
				memoryIpCounts.delete(key);
			}
		}
	}

	return { allowed: true };
}
