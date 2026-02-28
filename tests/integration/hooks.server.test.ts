import { afterEach, describe, expect, it, vi } from "vitest";
import { handle } from "../../src/hooks.server";
import * as rateLimit from "$lib/server/rate-limit";

interface TestEventOptions {
	method?: string;
	headers?: Record<string, string>;
	cookies?: Record<string, string>;
}

function createCookies(seed: Record<string, string> = {}) {
	const jar = new Map<string, string>(Object.entries(seed));

	return {
		get(name: string) {
			return jar.get(name);
		},
	} as const;
}

function createEvent(url: string, options: TestEventOptions = {}) {
	const { method = "GET", headers = {}, cookies = {} } = options;

	return {
		url: new URL(url),
		request: new Request(url, { method, headers: new Headers(headers) }),
		cookies: createCookies(cookies),
		platform: undefined,
	} as any;
}

describe("hooks.server", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("adds security headers to regular responses", async () => {
		vi.spyOn(rateLimit, "checkRateLimit").mockResolvedValue({ allowed: true });
		const event = createEvent("https://example.com/");

		const response = await handle({
			event,
			resolve: async () => new Response("ok"),
		});

		expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("x-frame-options")).toBe("DENY");
	});

	it("does not enforce CSRF tokens for safe API methods", async () => {
		vi.spyOn(rateLimit, "checkRateLimit").mockResolvedValue({ allowed: true });
		const event = createEvent("https://example.com/api/versions?type=npm&name=lodash", {
			method: "GET",
		});

		const response = await handle({
			event,
			resolve: async () => new Response(JSON.stringify({ versions: ["1.0.0"] }), { status: 200 }),
		});

		expect(response.status).toBe(200);
	});

	it("rejects unsafe API methods without CSRF token", async () => {
		vi.spyOn(rateLimit, "checkRateLimit").mockResolvedValue({ allowed: true });
		const event = createEvent("https://example.com/api/versions", {
			method: "POST",
		});

		const response = await handle({
			event,
			resolve: async () => new Response("ok"),
		});

		expect(response.status).toBe(403);
	});

	it("rejects unsafe API methods when origin does not match", async () => {
		vi.spyOn(rateLimit, "checkRateLimit").mockResolvedValue({ allowed: true });
		const event = createEvent("https://example.com/api/versions", {
			method: "POST",
			headers: {
				origin: "https://evil.example",
				"x-csrf-token": "known-token",
			},
			cookies: {
				csrf_token: "known-token",
			},
		});

		const response = await handle({
			event,
			resolve: async () => new Response("ok"),
		});

		expect(response.status).toBe(403);
	});

	it("skips rate limiting for static asset paths", async () => {
		const spy = vi.spyOn(rateLimit, "checkRateLimit").mockResolvedValue({ allowed: true });
		const event = createEvent("https://example.com/_app/immutable/chunk.js");

		await handle({
			event,
			resolve: async () => new Response("static"),
		});

		expect(spy).not.toHaveBeenCalled();
	});

	it("sanitizes package diff redirects", async () => {
		vi.spyOn(rateLimit, "checkRateLimit").mockResolvedValue({ allowed: true });
		const event = createEvent("https://example.com/package-diff?name=@scope/pkg&from=1.0.0&to=2.0.0");

		const response = await handle({
			event,
			resolve: async () => new Response("ok"),
		});

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/npm/%40scope/pkg/1.0.0...2.0.0");
	});
});
