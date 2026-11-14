import { describe, expect, it } from "vitest";
import { comparePath, parseComparePath } from "./url";

const none = new URLSearchParams();

describe("compare URLs", () => {
	it("round-trips scoped package names, unusual versions and the limits opt-out", () => {
		const request = { registry: "npm", name: "@types/node", from: "20.0.0", to: "22.0.0-rc.1+build", unlimited: true };
		const path = comparePath(request);
		expect(path).toBe("/npm/@types/node/20.0.0...22.0.0-rc.1%2Bbuild?limits=off");

		const url = new URL(path, "https://diff.test");
		const rest = decodeURIComponent(url.pathname.slice("/npm/".length));
		expect(parseComparePath("npm", rest, url.searchParams)).toEqual(request);
	});

	it("rejects paths without a name or a from...to range", () => {
		expect(parseComparePath("npm", "react", none)).toBeNull();
		expect(parseComparePath("npm", "react/1.0.0..2.0.0", none)).toBeNull();
		expect(parseComparePath("npm", "/1.0.0...2.0.0", none)).toBeNull();
		expect(parseComparePath("npm", "react/1.0.0...", none)).toBeNull();
		expect(parseComparePath("npm", `react/1.0.0...${"9".repeat(300)}`, none)).toBeNull();
	});
});
