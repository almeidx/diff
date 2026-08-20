/**
 * Archive entries for directories end with a separator. Normalizing drops that
 * slash, so the raw name is the only place this is still visible — and a
 * directory entry that survives normalization looks exactly like a root-level
 * file, which defeats wrapper-directory detection for both tar and zip.
 */
export function isDirectoryEntry(rawPath: string): boolean {
	return /[\\/]$/.test(rawPath);
}

export function normalizeArchivePath(path: string): string {
	return normalizePath(path);
}

/**
 * Strips the wrapper directory npm removes when installing a tarball.
 *
 * npm drops the first path component whatever it is named. Most packages use
 * `package/`, but DefinitelyTyped names the root after the type, so
 * `@types/node` ships `node/` and `@types/react` ships `react/`. Matching a
 * literal `package/` left those prefixes on every path, which surfaced as a
 * stray root folder in the file tree.
 *
 * The root is taken from the first entry and only removed from paths that
 * actually start with it, so an archive without one shared root is left alone.
 * Stateful so that tar can stay a single streaming pass.
 */
export function createTarRootStripper(): (path: string) => string {
	let root: string | null | undefined;

	return (path: string): string => {
		const isDirectory = isDirectoryEntry(path);
		const normalized = normalizePath(path);
		if (!normalized) return "";

		if (root === undefined) {
			const firstSlash = normalized.indexOf("/");
			if (firstSlash > 0) {
				root = `${normalized.slice(0, firstSlash)}/`;
			} else {
				// tar lists the wrapper directory itself first, and normalizing drops its trailing slash
				root = isDirectory ? `${normalized}/` : null;
			}
		}

		if (!root || !normalized.startsWith(root)) return normalized;
		return normalized.slice(root.length);
	};
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
