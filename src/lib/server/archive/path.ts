export function normalizeArchivePath(path: string, format: "tgz" | "zip"): string {
	const normalized = normalizePath(path);
	if (!normalized) return "";

	if (format === "tgz") {
		return normalized.startsWith("package/") ? normalized.slice("package/".length) : normalized;
	}

	return normalized;
}

export function getCommonZipRoot(paths: string[]): string | null {
	let root: string | null = null;

	for (const path of paths) {
		const firstSlash = path.indexOf("/");
		if (firstSlash <= 0) {
			return null;
		}

		const candidate = path.slice(0, firstSlash);
		if (!root) {
			root = candidate;
			continue;
		}

		if (root !== candidate) {
			return null;
		}
	}

	return root;
}

export function stripZipRoot(path: string, root: string | null): string {
	if (!root) return path;
	const prefix = `${root}/`;
	return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

function normalizePath(path: string): string {
	const cleaned = path
		.replace(/\\/g, "/")
		.replace(/^\.\/+/, "")
		.replace(/^\/+/, "");
	if (!cleaned) return "";

	const segments: string[] = [];
	for (const segment of cleaned.split("/")) {
		if (!segment || segment === ".") continue;
		if (segment === "..") {
			segments.pop();
			continue;
		}
		segments.push(segment);
	}

	return segments.join("/");
}
