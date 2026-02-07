import type { Handle } from '@sveltejs/kit';

const RATE_LIMIT = 30;
const WINDOW_MS = 60000;
const CLEANUP_INTERVAL_MS = 60000;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

const ipCounts = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();

function generateToken(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/package-diff') {
		const name = event.url.searchParams.get('name');
		const from = event.url.searchParams.get('from');
		const to = event.url.searchParams.get('to');

		if (name && from && to) {
			return new Response(null, {
				status: 302,
				headers: { Location: `/npm/${name}/${from}...${to}` }
			});
		}
	}

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

	if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
		lastCleanup = now;
		for (const [key, value] of ipCounts) {
			if (value.resetAt < now) {
				ipCounts.delete(key);
			}
		}
	}

	if (event.url.pathname.startsWith('/api/')) {
		const csrfToken = event.cookies.get(CSRF_COOKIE_NAME);
		const headerToken = event.request.headers.get(CSRF_HEADER_NAME);

		if (!csrfToken || !headerToken || csrfToken !== headerToken) {
			return new Response('Forbidden', { status: 403 });
		}
	}

	const response = await resolve(event);

	if (!event.cookies.get(CSRF_COOKIE_NAME)) {
		const token = generateToken();
		response.headers.append(
			'Set-Cookie',
			`${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Strict; Secure`
		);
	}

	return response;
};
