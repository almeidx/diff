import { describe, expect, it } from "vitest";
import { normalizeArchivePath } from "./path";

describe("normalizeArchivePath", () => {
	it("normalizes npm tgz paths without flattening nested directories", () => {
		expect(normalizeArchivePath("package/src/index.js", "tgz")).toBe("src/index.js");
		expect(normalizeArchivePath("package/package.json", "tgz")).toBe("package.json");
		expect(normalizeArchivePath("./package/lib/utils/a.js", "tgz")).toBe("lib/utils/a.js");
		expect(normalizeArchivePath("custom-root/file.js", "tgz")).toBe("custom-root/file.js");
	});

	it("normalizes zip paths by dropping the top-level folder only when present", () => {
		expect(normalizeArchivePath("plugin-name/plugin.php", "zip")).toBe("plugin.php");
		expect(normalizeArchivePath("plugin-name/includes/main.php", "zip")).toBe("includes/main.php");
		expect(normalizeArchivePath("readme.txt", "zip")).toBe("readme.txt");
		expect(normalizeArchivePath("./plugin-name/assets/icon.png", "zip")).toBe("assets/icon.png");
	});
});
