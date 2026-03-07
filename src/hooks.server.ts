import type { Handle } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/server/rate-limit";
import { logWarn, getClientIp } from "$lib/server/log.js";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

function generateToken(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function applySecurityHeaders(response: Response): Response {
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
	response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	return response;
}

function isRateLimitedPath(pathname: string): boolean {
	if (pathname.startsWith("/api/")) return true;
	if (pathname.startsWith("/npm/")) return true;
	if (pathname.startsWith("/wp/")) return true;
	return pathname === "/" || pathname === "/package-diff";
}

function isUnsafeMethod(method: string): boolean {
	return !SAFE_METHODS.has(method.toUpperCase());
}

function encodePathValue(value: string): string {
	return value
		.split("/")
		.filter((part) => part.length > 0)
		.map((part) => encodeURIComponent(part))
		.join("/");
}

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === "/package-diff") {
		const name = event.url.searchParams.get("name");
		const from = event.url.searchParams.get("from");
		const to = event.url.searchParams.get("to");

		if (name && from && to) {
			return applySecurityHeaders(
				new Response(null, {
					status: 302,
					headers: {
						Location: `/npm/${encodePathValue(name)}/${encodeURIComponent(from)}...${encodeURIComponent(to)}`,
					},
				}),
			);
		}
	}

	if (isRateLimitedPath(event.url.pathname)) {
		const rateLimitResult = await checkRateLimit(event);
		if (!rateLimitResult.allowed) {
			logWarn("request_rate_limited", {
				path: event.url.pathname,
				method: event.request.method,
				ip: getClientIp(event.request),
				retryAfterSeconds: rateLimitResult.retryAfterSeconds ?? 60,
			});
			return applySecurityHeaders(
				new Response("Too many requests. Please try again later.", {
					status: 429,
					headers: {
						"Retry-After": String(rateLimitResult.retryAfterSeconds ?? 60),
					},
				}),
			);
		}
	}

	if (event.url.pathname.startsWith("/api/") && isUnsafeMethod(event.request.method)) {
		const origin = event.request.headers.get("origin");
		if (origin && origin !== event.url.origin) {
			logWarn("csrf_origin_mismatch", {
				path: event.url.pathname,
				method: event.request.method,
				ip: getClientIp(event.request),
				origin,
				expectedOrigin: event.url.origin,
			});
			return applySecurityHeaders(new Response("Forbidden", { status: 403 }));
		}

		const csrfToken = event.cookies.get(CSRF_COOKIE_NAME);
		const headerToken = event.request.headers.get(CSRF_HEADER_NAME);

		if (!csrfToken || !headerToken || !timingSafeEqual(csrfToken, headerToken)) {
			logWarn("csrf_validation_failed", {
				path: event.url.pathname,
				method: event.request.method,
				ip: getClientIp(event.request),
				hasCookieToken: Boolean(csrfToken),
				hasHeaderToken: Boolean(headerToken),
			});
			return applySecurityHeaders(new Response("Forbidden", { status: 403 }));
		}
	}

	if (!event.cookies.get(CSRF_COOKIE_NAME)) {
		const token = generateToken();
		event.cookies.set(CSRF_COOKIE_NAME, token, {
			path: "/",
			sameSite: "strict",
			secure: true,
			httpOnly: false,
		});
	}

	return applySecurityHeaders(await resolve(event));
};
