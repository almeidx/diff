import { describe, expect, it, vi } from "vitest";
import { getCached } from "$lib/server/cache";

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("getCached", () => {
	it("deduplicates concurrent requests for the same key", async () => {
		const fetcher = vi.fn(async () => {
			await delay(20);
			return { value: 42 };
		});

		const [a, b, c] = await Promise.all([
			getCached("same-key", fetcher),
			getCached("same-key", fetcher),
			getCached("same-key", fetcher),
		]);

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(a).toEqual({ value: 42 });
		expect(b).toEqual({ value: 42 });
		expect(c).toEqual({ value: 42 });
	});

	it("does not deduplicate different keys", async () => {
		const fetcher = vi.fn(async () => ({ ok: true }));

		await Promise.all([getCached("key-a", fetcher), getCached("key-b", fetcher)]);

		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
