import { describe, expect, it } from "vitest";
import { createTarRootStripper, getCommonZipRoot, isDirectoryEntry, normalizeArchivePath, stripZipRoot } from "./path";

describe("normalizeArchivePath", () => {
	it("normalizes paths without flattening nested directories", () => {
		expect(normalizeArchivePath("plugin-name/plugin.php")).toBe("plugin-name/plugin.php");
		expect(normalizeArchivePath("plugin-name/includes/main.php")).toBe("plugin-name/includes/main.php");
		expect(normalizeArchivePath("readme.txt")).toBe("readme.txt");
		expect(normalizeArchivePath("./plugin-name/assets/icon.png")).toBe("plugin-name/assets/icon.png");
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

	it("finds the root once directory entries are excluded", () => {
		// "hello-dolly/" normalizes to "hello-dolly", which looks like a root-level
		// file and previously forced getCommonZipRoot to give up
		const withDirectory = ["hello-dolly", "hello-dolly/hello.php", "hello-dolly/readme.txt"];
		expect(getCommonZipRoot(withDirectory)).toBeNull();

		const filesOnly = ["hello-dolly/hello.php", "hello-dolly/readme.txt"];
		expect(getCommonZipRoot(filesOnly)).toBe("hello-dolly");
	});

	it("does not strip zip roots when entries are mixed at top-level", () => {
		const root = getCommonZipRoot(["plugin-name/plugin.php", "readme.txt"]);
		expect(root).toBeNull();
		expect(stripZipRoot("plugin-name/plugin.php", root)).toBe("plugin-name/plugin.php");
		expect(stripZipRoot("readme.txt", root)).toBe("readme.txt");
	});
});

describe("isDirectoryEntry", () => {
	it("recognizes archive entries that name a directory", () => {
		expect(isDirectoryEntry("hello-dolly/")).toBe(true);
		expect(isDirectoryEntry("node/")).toBe(true);
		expect(isDirectoryEntry("nested/dir/")).toBe(true);
	});

	it("does not treat files as directories", () => {
		expect(isDirectoryEntry("hello-dolly/hello.php")).toBe(false);
		expect(isDirectoryEntry("readme.txt")).toBe(false);
	});
});

describe("createTarRootStripper", () => {
	it("strips the conventional package/ wrapper", () => {
		const strip = createTarRootStripper();

		expect(strip("package/package.json")).toBe("package.json");
		expect(strip("package/src/index.js")).toBe("src/index.js");
		expect(strip("./package/lib/utils/a.js")).toBe("lib/utils/a.js");
	});

	it("strips a wrapper named after the package, as DefinitelyTyped publishes", () => {
		const strip = createTarRootStripper();

		// tar lists the wrapper directory first; the entry itself is filtered out downstream
		strip("node/");

		expect(strip("node/package.json")).toBe("package.json");
		expect(strip("node/dns/promises.d.ts")).toBe("dns/promises.d.ts");
		expect(strip("node/child_process.d.ts")).toBe("child_process.d.ts");
	});

	it("takes the root from the first entry and applies it consistently", () => {
		const strip = createTarRootStripper();

		expect(strip("react/index.d.ts")).toBe("index.d.ts");
		expect(strip("react/jsx-runtime.d.ts")).toBe("jsx-runtime.d.ts");
	});

	it("leaves paths alone when the archive has no single wrapper directory", () => {
		const strip = createTarRootStripper();

		expect(strip("README.md")).toBe("README.md");
		expect(strip("src/index.js")).toBe("src/index.js");
	});

	it("leaves entries outside the detected root untouched", () => {
		const strip = createTarRootStripper();

		expect(strip("package/index.js")).toBe("index.js");
		expect(strip("elsewhere/other.js")).toBe("elsewhere/other.js");
	});

	it("keeps state per archive rather than across them", () => {
		const first = createTarRootStripper();
		const second = createTarRootStripper();

		expect(first("node/fs.d.ts")).toBe("fs.d.ts");
		expect(second("package/fs.js")).toBe("fs.js");
	});
});
