import { describe, expect, it } from "vitest";
import { comparePath, parseComparePath } from "./url";

describe("compare URLs", () => {
	it("round-trips scoped package names and unusual versions", () => {
		const path = comparePath("npm", "@types/node", "20.0.0", "22.0.0-rc.1+build");
		expect(path).toBe("/npm/@types/node/20.0.0...22.0.0-rc.1%2Bbuild");

		const rest = decodeURIComponent(path.slice("/npm/".length));
		expect(parseComparePath(rest)).toEqual({ name: "@types/node", from: "20.0.0", to: "22.0.0-rc.1+build" });
	});

	it("rejects paths without a name or a from...to range", () => {
		expect(parseComparePath("react")).toBeNull();
		expect(parseComparePath("react/1.0.0..2.0.0")).toBeNull();
		expect(parseComparePath("/1.0.0...2.0.0")).toBeNull();
		expect(parseComparePath("react/1.0.0...")).toBeNull();
	});
});
