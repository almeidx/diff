import type { Handle } from '@sveltejs/kit';

const RATE_LIMIT = 30;
const WINDOW_MS = 60000;

const ipCounts = new Map<string, { count: number; resetAt: number }>();

export const handle: Handle = async ({ event, resolve }) => {
	const ip =
		event.request.headers.get('cf-connecting-ip') ||
		event.request.headers.get('x-forwarded-for')?.split(',')[0] ||
		'unknown';

	const now = Date.now();

	const record = ipCounts.get(ip);
	if (record && record.resetAt > now) {
		if (record.count >= RATE_LIMIT) {
			return new Response('Too many requests. Please try again later.', {
				status: 429,
				headers: {
					'Retry-After': String(Math.ceil((record.resetAt - now) / 1000))
				}
			});
		}
		record.count++;
	} else {
		ipCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
	}

	if (ipCounts.size > 10000) {
		const entries = Array.from(ipCounts.entries());
		for (const [key, value] of entries) {
			if (value.resetAt < now) {
				ipCounts.delete(key);
			}
		}
	}

	return resolve(event);
};
