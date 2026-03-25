import { describe, expect, it } from "vitest";
import { getLanguage, highlight } from "./prism";

describe("getLanguage", () => {
	it("maps known file extensions to Prism languages", () => {
		expect(getLanguage("src/app.ts")).toBe("typescript");
		expect(getLanguage("templates/email.hbs")).toBe("handlebars");
		expect(getLanguage("Dockerfile")).toBe("docker");
	});
});

describe("highlight", () => {
	it("returns highlighted HTML for loaded grammars", () => {
		const html = highlight("const answer: number = 42;", "typescript");

		expect(html).toContain('class="token keyword"');
		expect(html).toContain('class="token number"');
	});

	it("falls back to escaped text when the grammar is unknown", () => {
		expect(highlight("<tag>", "unknown")).toBe("&lt;tag&gt;");
	});
});
