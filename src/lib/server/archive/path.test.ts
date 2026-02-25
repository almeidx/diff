import { describe, expect, it } from "vitest";
import { getCommonZipRoot, normalizeArchivePath, stripZipRoot } from "./path";

describe("normalizeArchivePath", () => {
	it("normalizes npm tgz paths without flattening nested directories", () => {
		expect(normalizeArchivePath("package/src/index.js", "tgz")).toBe("src/index.js");
		expect(normalizeArchivePath("package/package.json", "tgz")).toBe("package.json");
		expect(normalizeArchivePath("./package/lib/utils/a.js", "tgz")).toBe("lib/utils/a.js");
		expect(normalizeArchivePath("custom-root/file.js", "tgz")).toBe("custom-root/file.js");
	});

	it("normalizes zip paths without flattening by default", () => {
		expect(normalizeArchivePath("plugin-name/plugin.php", "zip")).toBe("plugin-name/plugin.php");
		expect(normalizeArchivePath("plugin-name/includes/main.php", "zip")).toBe("plugin-name/includes/main.php");
		expect(normalizeArchivePath("readme.txt", "zip")).toBe("readme.txt");
		expect(normalizeArchivePath("./plugin-name/assets/icon.png", "zip")).toBe("plugin-name/assets/icon.png");
	});

	it("finds and strips a shared zip root folder when all entries share one", () => {
		const root = getCommonZipRoot([
			"plugin-name/plugin.php",
			"plugin-name/includes/main.php",
			"plugin-name/assets/icon.png",
		]);

		expect(root).toBe("plugin-name");
		expect(stripZipRoot("plugin-name/plugin.php", root)).toBe("plugin.php");
		expect(stripZipRoot("plugin-name/includes/main.php", root)).toBe("includes/main.php");
	});

	it("does not strip zip roots when entries are mixed at top-level", () => {
		const root = getCommonZipRoot(["plugin-name/plugin.php", "readme.txt"]);
		expect(root).toBeNull();
		expect(stripZipRoot("plugin-name/plugin.php", root)).toBe("plugin-name/plugin.php");
		expect(stripZipRoot("readme.txt", root)).toBe("readme.txt");
	});
});
