import type { Handle } from '@sveltejs/kit';

import { checkRateLimit } from '$lib/server/rate-limit';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

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

	const rateLimitResult = await checkRateLimit(event);
	if (!rateLimitResult.allowed) {
		return new Response('Too many requests. Please try again later.', {
			status: 429,
			headers: {
				'Retry-After': String(rateLimitResult.retryAfterSeconds ?? 60)
			}
		});
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
